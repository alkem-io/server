import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EntityNotFoundException } from '@common/exceptions';
import { LogContext } from '@common/enums';
import { Discussion } from './discussion.entity';
import { IDiscussion } from './discussion.interface';
import { UpdateDiscussionInput } from './dto/discussion.dto.update';
import { DeleteDiscussionInput } from './dto/discussion.dto.delete';
import { CommunicationRoomResult } from '../room/dto/communication.dto.room.result';
import { CommunicationAdapter } from '@services/adapters/communication-adapter/communication.adapter';
import { RoomService } from '../room/room.service';
import { CommunicationCreateDiscussionInput } from '../communication/dto/communication.dto.create.discussion';
import { AuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.entity';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { RoomSendMessageInput } from '../room/dto/room.dto.send.message';
import { RoomRemoveMessageInput } from '../room/dto/room.dto.remove.message';
import { IMessage } from '../message/message.interface';

@Injectable()
export class DiscussionService {
  constructor(
    @InjectRepository(Discussion)
    private discussionRepository: Repository<Discussion>,
    private communicationAdapter: CommunicationAdapter,
    private roomService: RoomService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async createDiscussion(
    discussionData: CommunicationCreateDiscussionInput,
    communicationGroupID: string,
    userID: string,
    displayName: string
  ): Promise<IDiscussion> {
    const discussion = new Discussion(
      communicationGroupID,
      `${displayName}-discussion-${discussionData.title}`,
      discussionData.title,
      discussionData.description,
      discussionData.category
    );
    discussion.authorization = new AuthorizationPolicy();
    discussion.communicationGroupID = communicationGroupID;
    discussion.displayName = `${displayName}-discussion-${discussion.title}`;
    discussion.createdBy = userID;
    discussion.commentsCount = 0;
    await this.save(discussion);
    discussion.communicationRoomID =
      await this.roomService.initializeCommunicationRoom(discussion);

    return await this.save(discussion);
  }

  async removeDiscussion(
    deleteData: DeleteDiscussionInput
  ): Promise<IDiscussion> {
    const discussionID = deleteData.ID;
    const discussion = await this.getDiscussionOrFail(discussionID);

    const result = await this.discussionRepository.remove(
      discussion as Discussion
    );
    await this.roomService.removeRoom(discussion);
    result.id = discussionID;
    return result;
  }

  async getDiscussionOrFail(discussionID: string): Promise<IDiscussion> {
    const discussion = await this.discussionRepository.findOneBy({
      id: discussionID,
    });
    if (!discussion)
      throw new EntityNotFoundException(
        `Not able to locate Discussion with the specified ID: ${discussionID}`,
        LogContext.CHALLENGES
      );
    return discussion;
  }

  async deleteDiscussion(discussionID: string): Promise<IDiscussion> {
    const discussion = await this.getDiscussionOrFail(discussionID);
    const result = await this.discussionRepository.remove(
      discussion as Discussion
    );
    result.id = discussionID;
    return result;
  }

  async updateDiscussion(
    discussion: IDiscussion,
    updateDiscussionData: UpdateDiscussionInput
  ): Promise<IDiscussion> {
    if (updateDiscussionData.title)
      discussion.title = updateDiscussionData.title;
    if (updateDiscussionData.category)
      discussion.category = updateDiscussionData.category;
    if (updateDiscussionData.description)
      discussion.description = updateDiscussionData.description;
    return await this.save(discussion);
  }

  async save(discussion: IDiscussion): Promise<IDiscussion> {
    return await this.discussionRepository.save(discussion);
  }

  async getDiscussionRoom(
    discussion: IDiscussion
  ): Promise<CommunicationRoomResult> {
    const communicationRoom = await this.roomService.getCommunicationRoom(
      discussion
    );
    const messagesCount = communicationRoom.messages.length;
    if (messagesCount != discussion.commentsCount) {
      this.logger.warn(
        `Discussion (${discussion.displayName}) had a comment count of ${discussion.commentsCount} that is not syncd with the messages count of ${messagesCount}`,
        LogContext.COMMUNICATION
      );
      discussion.commentsCount = messagesCount;
      await this.save(discussion);
    }
    return communicationRoom;
  }

  async sendMessageToDiscussion(
    discussion: IDiscussion,
    communicationUserID: string,
    messageData: RoomSendMessageInput
  ): Promise<IMessage> {
    const message = await this.roomService.sendMessage(
      discussion,
      communicationUserID,
      messageData
    );
    discussion.commentsCount = discussion.commentsCount + 1;
    await this.save(discussion);
    return message;
  }

  async removeMessageFromDiscussion(
    discussion: IDiscussion,
    communicationUserID: string,
    messageData: RoomRemoveMessageInput
  ): Promise<string> {
    await this.roomService.removeMessage(
      discussion,
      communicationUserID,
      messageData
    );
    discussion.commentsCount = discussion.commentsCount - 1;
    await this.save(discussion);

    return messageData.messageID;
  }

  async isDiscussionInCommunication(
    discussionID: string,
    communicationID: string
  ): Promise<boolean> {
    const discussion = await this.discussionRepository
      .createQueryBuilder('discussion')
      .where('discussion.id = :discussionID')
      .andWhere('discussion.communicationId = :communicationID')
      .setParameters({
        discussionID: `${discussionID}`,
        communicationID: `${communicationID}`,
      })
      .getOne();
    if (discussion) return true;
    return false;
  }
}
