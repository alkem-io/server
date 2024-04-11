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
import { RoomSendMessageReplyInput } from './dto/room.dto.send.message.reply';
import { RoomAddReactionToMessageInput } from './dto/room.dto.add.reaction.to.message';
import { RoomRemoveReactionToMessageInput } from './dto/room.dto.remove.message.reaction';
import { RoomRemoveMessageInput } from './dto/room.dto.remove.message';
import { RoomSendMessageInput } from './dto/room.dto.send.message';
import { CommunicationRoomResult } from '@services/adapters/communication-adapter/dto/communication.dto.room.result';

interface MessageSender {
  id: string;
  type: 'user' | 'virtualContributor';
}

@Injectable()
export class RoomService {
  constructor(
    @InjectRepository(Room)
    private roomRepository: Repository<Room>,
    private identityResolverService: IdentityResolverService,
    private communicationAdapter: CommunicationAdapter,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async createRoom(displayName: string, roomType: RoomType): Promise<IRoom> {
    const room = new Room(displayName, roomType);
    room.authorization = new AuthorizationPolicy();
    room.externalRoomID = await this.initializeCommunicationRoom(room);
    room.messagesCount = 0;
    return await this.roomRepository.save(room);
  }

  async getRoomOrFail(
    roomID: string,
    options?: FindOneOptions<Room>
  ): Promise<IRoom> {
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

  async deleteRoom(room: IRoom): Promise<IRoom> {
    const result = await this.roomRepository.remove(room as Room);
    await this.communicationAdapter.removeRoom(room.externalRoomID);
    result.id = room.id;
    return result;
  }

  async save(room: IRoom): Promise<IRoom> {
    return await this.roomRepository.save(room);
  }

  async getMessages(room: IRoom): Promise<IMessage[]> {
    const externalRoom = await this.communicationAdapter.getCommunityRoom(
      room.externalRoomID
    );
    const messagesCount = externalRoom.messages.length;
    if (messagesCount != room.messagesCount) {
      this.logger.warn(
        `Room (${room.id}) had a comment count of ${room.messagesCount} that is not synced with the messages count of ${messagesCount}`,
        LogContext.COMMUNICATION
      );
      room.messagesCount = messagesCount;
      await this.save(room);
    }
    return await this.populateRoomMessageSenders(externalRoom.messages);
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

  async populateRoomsMessageSenders(
    rooms: CommunicationRoomResult[]
  ): Promise<CommunicationRoomResult[]> {
    for (const room of rooms) {
      room.messages = await this.populateRoomMessageSenders(room.messages);
    }

    return rooms;
  }

  private async identitySender(
    knownSendersMap: Map<string, MessageSender>,
    matrixUserID: string
  ): Promise<MessageSender> {
    let messageSender = knownSendersMap.get(matrixUserID);
    if (!messageSender) {
      const alkemioUserID =
        await this.identityResolverService.getUserIDByCommunicationsID(
          matrixUserID
        );
      if (alkemioUserID) {
        messageSender = {
          id: alkemioUserID,
          type: 'user',
        };
      } else {
        const virtualContributorID =
          await this.identityResolverService.getContributorIDByCommunicationsID(
            matrixUserID
          );
        if (virtualContributorID) {
          messageSender = {
            id: virtualContributorID,
            type: 'virtualContributor',
          };
        }
      }
      if (messageSender) {
        knownSendersMap.set(matrixUserID, messageSender);
      }
    }
    if (!messageSender) {
      throw new Error(`Unable to identify sender for ${matrixUserID}`);
    }
    return messageSender;
  }

  async populateRoomMessageSenders(messages: IMessage[]): Promise<IMessage[]> {
    const knownSendersMap = new Map<string, MessageSender>();
    for (const message of messages) {
      const matrixUserID = message.sender;
      const messageSender = await this.identitySender(
        knownSendersMap,
        matrixUserID
      );
      message.sender = messageSender.id;
      message.senderType = messageSender.type;
      if (message.reactions) {
        message.reactions = await this.populateRoomReactionSenders(
          message.reactions,
          knownSendersMap
        );
      } else {
        message.reactions = [];
      }
    }

    return messages;
  }

  async populateRoomReactionSenders(
    reactions: IMessageReaction[],
    knownSendersMap: Map<string, MessageSender>
  ): Promise<IMessageReaction[]> {
    for (const reaction of reactions) {
      const matrixUserID = reaction.sender;
      const reactionSender = await this.identitySender(
        knownSendersMap,
        matrixUserID
      );
      reaction.sender = reactionSender.id;
    }

    return reactions;
  }

  async initializeCommunicationRoom(room: IRoom): Promise<string> {
    if (room.externalRoomID && room.externalRoomID.length > 0) {
      this.logger.warn?.(
        `Roomable (${room.id}) already has a communication room: ${room.externalRoomID}`,
        LogContext.COMMUNICATION
      );
      return room.externalRoomID;
    }
    try {
      room.externalRoomID = await this.communicationAdapter.createCommunityRoom(
        room.displayName,
        {
          roomableID: room.id,
        }
      );
      return room.externalRoomID;
    } catch (error: any) {
      this.logger.error(
        `Unable to initialize roomable communication room (${room.displayName}): ${error}`,
        error?.stack,
        LogContext.COMMUNICATION
      );
    }
    return '';
  }

  async sendMessage(
    room: IRoom,
    communicationUserID: string,
    messageData: RoomSendMessageInput
  ): Promise<IMessage> {
    // Ensure the user is a member of room and group so can send
    await this.communicationAdapter.addUserToRoom(
      room.externalRoomID,
      communicationUserID
    );
    const alkemioUserID =
      await this.identityResolverService.getUserIDByCommunicationsID(
        communicationUserID
      );
    const message = await this.communicationAdapter.sendMessage({
      senderCommunicationsID: communicationUserID,
      message: messageData.message,
      roomID: room.externalRoomID,
    });

    message.sender = alkemioUserID!;
    room.messagesCount = room.messagesCount + 1;
    await this.save(room);
    return message;
  }

  async sendMessageReply(
    room: IRoom,
    communicationUserID: string,
    messageData: RoomSendMessageReplyInput,
    senderType: 'user' | 'virtualContributor'
  ): Promise<IMessage> {
    // Ensure the user is a member of room and group so can send
    await this.communicationAdapter.addUserToRoom(
      room.externalRoomID,
      communicationUserID
    );

    const alkemioSenderID =
      senderType === 'virtualContributor'
        ? await this.identityResolverService.getContributorIDByCommunicationsID(
            communicationUserID
          )
        : await this.identityResolverService.getUserIDByCommunicationsID(
            communicationUserID
          );
    const message = await this.communicationAdapter.sendMessageReply(
      {
        senderCommunicationsID: communicationUserID,
        message: messageData.message,
        roomID: room.externalRoomID,
        threadID: messageData.threadID,
      },
      senderType
    );

    message.sender = alkemioSenderID!;
    message.senderType = senderType;

    room.messagesCount = room.messagesCount + 1;
    await this.save(room);

    return message;
  }

  async addReactionToMessage(
    room: IRoom,
    communicationUserID: string,
    reactionData: RoomAddReactionToMessageInput
  ): Promise<IMessageReaction> {
    // Ensure the user is a member of room and group so can send
    await this.communicationAdapter.addUserToRoom(
      room.externalRoomID,
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
    await this.communicationAdapter.addUserToRoom(
      room.externalRoomID,
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
