import { Injectable } from '@nestjs/common';
import { RoomSendMessageInput } from '../room/dto/room.dto.send.message';
import { IMessage } from '../message/message.interface';
import { IdentityResolverService } from '@services/infrastructure/entity-resolver/identity.resolver.service';
import { CommunicationAdapter } from '@services/adapters/communication-adapter/communication.adapter';
import { RoomSendMessageReplyInput } from '../room/dto/room.dto.send.message.reply';

import { RoomAddReactionToMessageInput } from '../room/dto/room.dto.add.reaction.to.message';
import { RoomRemoveReactionToMessageInput } from '../room/dto/room.dto.remove.message.reaction';

@Injectable()
export class MessageService {
  constructor(
    private identityResolverService: IdentityResolverService,
    private communicationAdapter: CommunicationAdapter
  ) {}

  async sendMessageToRoom(
    communicationRoomID: string,
    communicationUserID: string,
    messageData: RoomSendMessageInput
  ): Promise<IMessage> {
    await this.communicationAdapter.addUserToRoom(
      communicationRoomID,
      communicationUserID
    );

    const alkemioUserID =
      await this.identityResolverService.getUserIDByCommunicationsID(
        communicationUserID
      );
    const message = await this.communicationAdapter.sendMessage({
      senderCommunicationsID: communicationUserID,
      message: messageData.message,
      roomID: communicationRoomID,
    });

    message.sender = alkemioUserID;
    return message;
  }

  async sendMessageReplyToRoom(
    communicationRoomID: string,
    communicationUserID: string,
    messageData: RoomSendMessageReplyInput
  ): Promise<IMessage> {
    await this.communicationAdapter.addUserToRoom(
      communicationRoomID,
      communicationUserID
    );

    const alkemioUserID =
      await this.identityResolverService.getUserIDByCommunicationsID(
        communicationUserID
      );
    const message = await this.communicationAdapter.sendMessageReply({
      senderCommunicationsID: communicationUserID,
      message: messageData.message,
      roomID: communicationRoomID,
      threadID: messageData.threadID,
    });

    message.sender = alkemioUserID;
    return message;
  }

  async addMessageReactionInRoom(
    communicationRoomID: string,
    communicationUserID: string,
    reactionData: RoomAddReactionToMessageInput
  ): Promise<IMessage> {
    await this.communicationAdapter.addUserToRoom(
      communicationRoomID,
      communicationUserID
    );

    const alkemioUserID =
      await this.identityResolverService.getUserIDByCommunicationsID(
        communicationUserID
      );

    const message = await this.communicationAdapter.addReaction({
      senderCommunicationsID: communicationUserID,
      text: reactionData.text,
      roomID: communicationRoomID,
      messageID: reactionData.messageID,
    });

    message.sender = alkemioUserID;

    return message;
  }

  async removeMessageReactionInRoom(
    communicationRoomID: string,
    communicationUserID: string,
    reactionData: RoomRemoveReactionToMessageInput
  ): Promise<boolean> {
    await this.communicationAdapter.addUserToRoom(
      communicationRoomID,
      communicationUserID
    );

    await this.communicationAdapter.removeReaction({
      senderCommunicationsID: communicationUserID,
      roomID: communicationRoomID,
      reactionID: reactionData.reactionID,
    });

    return true;
  }
}
