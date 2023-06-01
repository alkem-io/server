import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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

  async getRoomOrFail(roomID: string): Promise<IRoom> {
    const room = await this.roomRepository.findOneBy({
      id: roomID,
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
    return messageData.messageID;
  }

  async populateRoomMessageSenders(messages: IMessage[]): Promise<IMessage[]> {
    const knownSendersMap = new Map<string, string>();
    for (const message of messages) {
      const matrixUserID = message.sender;
      let alkemioUserID = knownSendersMap.get(matrixUserID);
      if (!alkemioUserID) {
        alkemioUserID =
          await this.identityResolverService.getUserIDByCommunicationsID(
            matrixUserID
          );
        knownSendersMap.set(matrixUserID, alkemioUserID);
      }
      message.sender = alkemioUserID;
      if (message.reactions)
        message.reactions = await this.populateRoomReactionSenders(
          message.reactions,
          knownSendersMap
        );
    }

    return messages;
  }

  async populateRoomReactionSenders(
    reactions: IMessageReaction[],
    knownSendersMap: Map<string, string>
  ): Promise<IMessageReaction[]> {
    for (const reaction of reactions) {
      const matrixUserID = reaction.sender;
      let alkemioUserID = knownSendersMap.get(matrixUserID);
      if (!alkemioUserID) {
        alkemioUserID =
          await this.identityResolverService.getUserIDByCommunicationsID(
            matrixUserID
          );
        knownSendersMap.set(matrixUserID, alkemioUserID);
      }
      reaction.sender = alkemioUserID;
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
      this.logger.error?.(
        `Unable to initialize roomable communication room (${room.displayName}): ${error}`,
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

    message.sender = alkemioUserID;
    return message;
  }

  private async sendRoomMessage(
    room: IRoom,
    communicationUserID: string,
    messageData: RoomSendMessageInput
  ): Promise<IMessage> {
    const message = await this.sendMessage(
      room,
      communicationUserID,
      messageData
    );
    room.messagesCount = room.messagesCount + 1;
    await this.save(room);
    return message;
  }

  async sendMessageReply(
    room: IRoom,
    communicationUserID: string,
    messageData: RoomSendMessageReplyInput
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
    const message = await this.communicationAdapter.sendMessageReply({
      senderCommunicationsID: communicationUserID,
      message: messageData.message,
      roomID: room.externalRoomID,
      threadID: messageData.threadID,
    });

    message.sender = alkemioUserID;
    return message;
  }

  async addReactionToMessage(
    room: IRoom,
    communicationUserID: string,
    messageData: RoomAddReactionToMessageInput
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
    const message = await this.communicationAdapter.addReaction({
      senderCommunicationsID: communicationUserID,
      text: messageData.text,
      roomID: room.externalRoomID,
      messageID: messageData.messageID,
    });

    message.sender = alkemioUserID;
    return message;
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
        LogContext.COMMUNICATION
      );
      return senderCommunicationID;
    }
    return await this.identityResolverService.getUserIDByCommunicationsID(
      senderCommunicationID
    );
  }
}
