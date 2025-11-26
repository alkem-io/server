import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOneOptions, Repository } from 'typeorm';
import { EntityNotFoundException } from '@common/exceptions';
import { LogContext } from '@common/enums';
import { AuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.entity';
import { Room } from './room.entity';
import { IRoom } from './room.interface';
import { CommunicationAdapter } from '@services/adapters/communication-adapter/communication.adapter';
import { IMessage } from '../message/message.interface';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { IdentityResolverService } from '@services/infrastructure/entity-resolver/identity.resolver.service';
import { RoomType } from '@common/enums/room.type';
import { IMessageReaction } from '../message.reaction/message.reaction.interface';
import { RoomAddReactionToMessageInput } from './dto/room.dto.add.reaction.to.message';
import { RoomRemoveReactionToMessageInput } from './dto/room.dto.remove.message.reaction';
import { RoomRemoveMessageInput } from './dto/room.dto.remove.message';
import { VcInteractionService } from '../vc-interaction/vc.interaction.service';
import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import { RoomLookupService } from '../room-lookup/room.lookup.service';
import { CreateRoomInput } from './dto/room.dto.create';
import { CommunicationStartDirectMessagingUserInput } from '@services/adapters/communication-adapter/dto/communication.dto.direct.messaging.start';
import { CommunicationStopDirectMessagingUserInput } from '@services/adapters/communication-adapter/dto/communication.dto.direct.messaging.stop';
import { DeleteRoomInput } from './dto/room.dto.delete';

@Injectable()
export class RoomService {
  constructor(
    @InjectRepository(Room)
    private roomRepository: Repository<Room>,
    private identityResolverService: IdentityResolverService,
    private communicationAdapter: CommunicationAdapter,
    private vcInteractionService: VcInteractionService,
    private roomLookupService: RoomLookupService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async createRoom(roomData: CreateRoomInput): Promise<IRoom> {
    const room = new Room(roomData.displayName, roomData.type);
    room.authorization = new AuthorizationPolicy(AuthorizationPolicyType.ROOM);
    room.externalRoomID = await this.createExternalCommunicationRoom(roomData);
    room.messagesCount = 0;
    room.vcInteractions = [];
    return room;
  }

  async getRoomOrFail(
    roomID: string,
    options?: FindOneOptions<Room>
  ): Promise<Room> {
    const room = await this.roomRepository.findOne({
      where: { id: roomID },
      ...options,
    });
    if (!room)
      throw new EntityNotFoundException(
        `Not able to locate Room with the specified ID: ${roomID}`,
        LogContext.COMMUNICATION
      );
    return room;
  }

  async deleteRoom(deleteData: DeleteRoomInput): Promise<IRoom> {
    const room = await this.getRoomOrFail(deleteData.roomID, {
      relations: {
        vcInteractions: true,
      },
    });
    if (!room.vcInteractions) {
      throw new EntityNotFoundException(
        `Not able to locate entities on Room for deletion: ${deleteData.roomID}`,
        LogContext.COMMUNICATION
      );
    }
    for (const interaction of room.vcInteractions) {
      await this.vcInteractionService.removeVcInteraction(interaction.id);
    }
    const result = await this.roomRepository.remove(room as Room);

    // Only delete from external Matrix server if flag is true
    if (room.type === RoomType.CONVERSATION_DIRECT) {
      if (
        !deleteData.senderCommunicationID ||
        !deleteData.receiverCommunicationID
      ) {
        throw new Error(
          `Missing senderID or receiverID for direct messaging room deletion: ${room.id}`
        );
      }
      const deleteDirectData: CommunicationStopDirectMessagingUserInput = {
        senderCommunicationsID: deleteData.senderCommunicationID,
        receiverCommunicationsID: deleteData.receiverCommunicationID,
      };
      await this.communicationAdapter.stopDirectMessagingToUser(
        deleteDirectData
      );
    } else {
      await this.communicationAdapter.removeRoom(room.externalRoomID);
    }
    result.id = room.id;
    return result;
  }

  async save(room: IRoom): Promise<IRoom> {
    return await this.roomRepository.save(room);
  }

  async getMessages(room: IRoom): Promise<IMessage[]> {
    const messages = await this.roomLookupService.getMessages(room);

    const messagesCount = messages.length;
    if (messagesCount != room.messagesCount) {
      this.logger.warn(
        `Room (${room.id}) had a comment count of ${room.messagesCount} that is not synced with the messages count of ${messagesCount}`,
        LogContext.COMMUNICATION
      );
      room.messagesCount = messagesCount;
      await this.save(room);
    }
    return messages;
  }

  async removeRoomMessage(
    room: IRoom,
    communicationUserID: string,
    messageData: RoomRemoveMessageInput
  ): Promise<string> {
    await this.communicationAdapter.deleteMessage({
      senderCommunicationsID: communicationUserID,
      messageId: messageData.messageID,
      roomID: room.externalRoomID,
    });
    room.messagesCount = room.messagesCount - 1;
    await this.save(room);
    return messageData.messageID;
  }

  private async createExternalCommunicationRoom(
    roomData: CreateRoomInput
  ): Promise<string> {
    try {
      if (roomData.type === RoomType.CONVERSATION_DIRECT) {
        if (
          !roomData.senderCommunicationID ||
          !roomData.receiverCommunicationID
        ) {
          throw new Error(
            `Missing senderID or receiverID for direct messaging room creation: ${roomData.displayName}`
          );
        }
        this.logger.verbose?.(
          `Creating direct message room via Matrix for room: ${roomData.displayName}`,
          LogContext.COMMUNICATION_CONVERSATION
        );
        const directMessagingData: CommunicationStartDirectMessagingUserInput =
          {
            senderCommunicationsID: roomData.senderCommunicationID,
            receiverCommunicationsID: roomData.receiverCommunicationID,
          };
        return await this.communicationAdapter.startDirectMessagingToUser(
          directMessagingData
        );
      } else {
        this.logger.verbose?.(
          `Creating group message room via Matrix for room: ${roomData.displayName}`,
          LogContext.COMMUNICATION
        );

        return await this.communicationAdapter.createCommunityRoom(
          roomData.displayName,
          roomData.senderCommunicationID
        );
      }
    } catch (error: any) {
      this.logger.error(
        `Unable to initialize roomable communication room (${roomData.displayName}): ${error}`,
        error?.stack,
        LogContext.COMMUNICATION
      );
    }
    return '';
  }

  async addReactionToMessage(
    room: IRoom,
    communicationUserID: string,
    reactionData: RoomAddReactionToMessageInput
  ): Promise<IMessageReaction> {
    // Ensure the user is a member of room and group so can send
    await this.communicationAdapter.userAddToRooms(
      [room.externalRoomID],
      communicationUserID
    );

    const alkemioUserID =
      await this.identityResolverService.getUserIDByCommunicationsID(
        communicationUserID
      );
    const reaction = await this.communicationAdapter.addReaction({
      senderCommunicationsID: communicationUserID,
      emoji: reactionData.emoji,
      roomID: room.externalRoomID,
      messageID: reactionData.messageID,
    });

    reaction.sender = alkemioUserID!;
    return reaction;
  }

  async removeReactionToMessage(
    room: IRoom,
    communicationUserID: string,
    messageData: RoomRemoveReactionToMessageInput
  ): Promise<boolean> {
    // Ensure the user is a member of room and group so can send
    await this.communicationAdapter.userAddToRooms(
      [room.externalRoomID],
      communicationUserID
    );

    await this.communicationAdapter.removeReaction({
      senderCommunicationsID: communicationUserID,
      roomID: room.externalRoomID,
      reactionID: messageData.reactionID,
    });

    return true;
  }

  async getUserIdForMessage(room: IRoom, messageID: string): Promise<string> {
    const senderCommunicationID =
      await this.communicationAdapter.getMessageSender(
        room.externalRoomID,
        messageID
      );
    if (senderCommunicationID === '') {
      this.logger.error(
        `Unable to identify sender for ${room.id} - ${messageID}`,
        undefined,
        LogContext.COMMUNICATION
      );
      return senderCommunicationID;
    }
    const alkemioUserID =
      await this.identityResolverService.getUserIDByCommunicationsID(
        senderCommunicationID
      );

    return alkemioUserID ?? '';
  }

  async getUserIdForReaction(room: IRoom, reactionID: string): Promise<string> {
    const senderCommunicationID =
      await this.communicationAdapter.getReactionSender(
        room.externalRoomID,
        reactionID
      );
    if (senderCommunicationID === '') {
      this.logger.error(
        `Unable to identify sender for ${room.id} - ${reactionID}`,
        undefined,
        LogContext.COMMUNICATION
      );
      return senderCommunicationID;
    }
    const alkemioUserID =
      await this.identityResolverService.getUserIDByCommunicationsID(
        senderCommunicationID
      );

    return alkemioUserID ?? '';
  }
}
