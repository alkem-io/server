import { LogContext } from '@common/enums';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { CommunicationAdapter } from '@services/platform/communication-adapter/communication.adapter';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { IdentityResolverService } from '../identity-resolver/identity.resolver.service';
import { CommunicationMessageResult } from '../message/communication.dto.message.result';
import { CommunicationRoomResult } from './dto/communication.dto.room.result';
import { RoomRemoveMessageInput } from './dto/room.dto.remove.message';
import { RoomSendMessageInput } from './dto/room.dto.send.message';
import { IRoomable } from './roomable.interface';

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
    try {
      const communicationRoomID =
        await this.communicationAdapter.createCommunityRoom(
          roomable.communicationGroupID,
          roomable.displayName,
          { roomableID: roomable.id }
        );
      return communicationRoomID;
    } catch (error) {
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
  ): Promise<CommunicationMessageResult> {
    // Ensure the user is a member of room and group so can send
    await this.communicationAdapter.addUserToRoom(
      roomable.communicationGroupID,
      roomable.communicationRoomID,
      communicationUserID
    );
    // Todo: call this first to allow room access to complete
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
    messageID: string,
    communicationUserID: string
  ): Promise<string> {
    const senderCommunicationID =
      await this.communicationAdapter.getMessageSender(
        roomable.communicationRoomID,
        messageID,
        communicationUserID
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
