import { LogContext } from '@common/enums';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { CommunicationAdapter } from '@services/adapters/communication-adapter/communication.adapter';
import { IdentityResolverService } from '@services/infrastructure/entity-resolver/identity.resolver.service';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { IMessage } from '../message/message.interface';
import { CommunicationRoomResult } from './dto/communication.dto.room.result';
import { RoomRemoveMessageInput } from './dto/room.dto.remove.message';
import { RoomSendMessageInput } from './dto/room.dto.send.message';
import { IRoomable } from './roomable.interface';
import { RoomSendMessageReplyInput } from './dto/room.dto.send.message.reply';
import { RoomAddReactionToMessageInput } from './dto/room.dto.add.reaction.to.message';
import { RoomRemoveReactionToMessageInput } from './dto/room.dto.remove.message.reaction';

@Injectable()
export class RoomService {
  constructor(
    private identityResolverService: IdentityResolverService,
    private communicationAdapter: CommunicationAdapter,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  // Convert from Matrix ID to Alkemio User ID
  async populateRoomMessageSenders(
    rooms: CommunicationRoomResult[]
  ): Promise<CommunicationRoomResult[]> {
    const knownSendersMap = new Map();
    for (const room of rooms) {
      for (const message of room.messages) {
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
      }
    }

    return rooms;
  }

  async initializeCommunicationRoom(roomable: IRoomable): Promise<string> {
    if (
      roomable.communicationRoomID &&
      roomable.communicationRoomID.length > 0
    ) {
      this.logger.warn?.(
        `Roomable (${roomable.displayName}) already has a communication room: ${roomable.communicationRoomID}`,
        LogContext.COMMUNICATION
      );
      return roomable.communicationRoomID;
    }
    try {
      roomable.communicationRoomID =
        await this.communicationAdapter.createCommunityRoom(
          roomable.displayName,
          { roomableID: roomable.id }
        );
      return roomable.communicationRoomID;
    } catch (error: any) {
      this.logger.error?.(
        `Unable to initialize roomable communication room (${roomable.displayName}): ${error}`,
        LogContext.COMMUNICATION
      );
    }
    return '';
  }

  async getCommunicationRoom(
    roomable: IRoomable
  ): Promise<CommunicationRoomResult> {
    const room = await this.communicationAdapter.getCommunityRoom(
      roomable.communicationRoomID
    );

    await this.populateRoomMessageSenders([room]);

    return room;
  }

  async sendMessage(
    roomable: IRoomable,
    communicationUserID: string,
    messageData: RoomSendMessageInput
  ): Promise<IMessage> {
    // Ensure the user is a member of room and group so can send
    await this.communicationAdapter.addUserToRoom(
      roomable.communicationRoomID,
      communicationUserID
    );
    const alkemioUserID =
      await this.identityResolverService.getUserIDByCommunicationsID(
        communicationUserID
      );
    const message = await this.communicationAdapter.sendMessage({
      senderCommunicationsID: communicationUserID,
      message: messageData.message,
      roomID: roomable.communicationRoomID,
    });

    message.sender = alkemioUserID;
    return message;
  }

  async sendMessageReply(
    roomable: IRoomable,
    communicationUserID: string,
    messageData: RoomSendMessageReplyInput
  ): Promise<IMessage> {
    // Ensure the user is a member of room and group so can send
    await this.communicationAdapter.addUserToRoom(
      roomable.communicationRoomID,
      communicationUserID
    );

    const alkemioUserID =
      await this.identityResolverService.getUserIDByCommunicationsID(
        communicationUserID
      );
    const message = await this.communicationAdapter.sendMessageReply({
      senderCommunicationsID: communicationUserID,
      message: messageData.message,
      roomID: roomable.communicationRoomID,
      threadID: messageData.threadID,
      lastMessageID: messageData.lastMessageID,
    });

    message.sender = alkemioUserID;
    return message;
  }

  async addReactionToMessage(
    roomable: IRoomable,
    communicationUserID: string,
    messageData: RoomAddReactionToMessageInput
  ): Promise<IMessage> {
    // Ensure the user is a member of room and group so can send
    await this.communicationAdapter.addUserToRoom(
      roomable.communicationRoomID,
      communicationUserID
    );

    const alkemioUserID =
      await this.identityResolverService.getUserIDByCommunicationsID(
        communicationUserID
      );
    const message = await this.communicationAdapter.addReaction({
      senderCommunicationsID: communicationUserID,
      text: messageData.text,
      roomID: roomable.communicationRoomID,
      messageID: messageData.messageID,
    });

    message.sender = alkemioUserID;
    return message;
  }

  async removeReactionToMessage(
    roomable: IRoomable,
    communicationUserID: string,
    messageData: RoomRemoveReactionToMessageInput
  ): Promise<boolean> {
    // Ensure the user is a member of room and group so can send
    await this.communicationAdapter.addUserToRoom(
      roomable.communicationRoomID,
      communicationUserID
    );

    await this.communicationAdapter.removeReaction({
      senderCommunicationsID: communicationUserID,
      roomID: roomable.communicationRoomID,
      reactionID: messageData.reactionID,
    });

    return true;
  }

  async removeMessage(
    roomable: IRoomable,
    communicationUserID: string,
    messageData: RoomRemoveMessageInput
  ): Promise<string> {
    return await this.communicationAdapter.deleteMessage({
      senderCommunicationsID: communicationUserID,
      messageId: messageData.messageID,
      roomID: roomable.communicationRoomID,
    });
  }

  async removeRoom(roomable: IRoomable): Promise<boolean> {
    return await this.communicationAdapter.removeRoom(
      roomable.communicationRoomID
    );
  }

  async getUserIdForMessage(
    roomable: IRoomable,
    messageID: string
  ): Promise<string> {
    const senderCommunicationID =
      await this.communicationAdapter.getMessageSender(
        roomable.communicationRoomID,
        messageID
      );
    if (senderCommunicationID === '') {
      this.logger.error(
        `Unable to identify sender for ${roomable.displayName} - ${messageID}`,
        LogContext.COMMUNICATION
      );
      return senderCommunicationID;
    }
    return await this.identityResolverService.getUserIDByCommunicationsID(
      senderCommunicationID
    );
  }
}
