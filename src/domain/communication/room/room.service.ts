import { LogContext } from '@common/enums';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { CommunicationAdapter } from '@services/platform/communication-adapter/communication.adapter';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { IdentityResolverService } from '../identity-resolver/identity.resolver.service';
import { CommunicationRoomResult } from './communication.dto.room.result';
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
    roomable: IRoomable,
    communicationUserID: string
  ): Promise<CommunicationRoomResult> {
    await this.communicationAdapter.ensureUserHasAccesToCommunityMessaging(
      roomable.communicationGroupID,
      [roomable.communicationRoomID],
      communicationUserID
    );
    const room = await this.communicationAdapter.getCommunityRoom(
      roomable.communicationRoomID,
      communicationUserID
    );

    await this.populateRoomMessageSenders([room]);

    return room;
  }

  async sendMessage(
    roomable: IRoomable,
    communicationUserID: string,
    messageData: RoomSendMessageInput
  ): Promise<string> {
    await this.communicationAdapter.ensureUserHasAccesToCommunityMessaging(
      roomable.communicationGroupID,
      [roomable.communicationRoomID],
      communicationUserID
    );
    return await this.communicationAdapter.sendMessageToCommunityRoom({
      senderCommunicationsID: communicationUserID,
      message: messageData.message,
      roomID: roomable.communicationRoomID,
    });
  }

  async removeMessage(
    roomable: IRoomable,
    communicationUserID: string,
    messageData: RoomRemoveMessageInput
  ) {
    await this.communicationAdapter.ensureUserHasAccesToCommunityMessaging(
      roomable.communicationGroupID,
      [roomable.communicationRoomID],
      communicationUserID
    );
    return await this.communicationAdapter.deleteMessageFromCommunityRoom({
      senderCommunicationsID: communicationUserID,
      messageId: messageData.messageID,
      roomID: roomable.communicationRoomID,
    });
  }
}
