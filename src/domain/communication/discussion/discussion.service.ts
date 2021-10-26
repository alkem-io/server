import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EntityNotFoundException } from '@common/exceptions';
import { LogContext } from '@common/enums';
import { Discussion } from './discussion.entity';
import { IDiscussion } from './discussion.interface';
import { UpdateDiscussionInput } from './dto/discussion.dto.update';
import { DeleteDiscussionInput } from './dto/discussion.dto.delete';
import { CommunicationRoomResult } from '../room/communication.dto.room.result';
import { CommunicationAdapterService } from '@services/platform/communication-adapter/communication.adapter.service';
import { RoomService } from '../room/room.service';
import { DiscussionSendMessageInput } from './dto/discussion.dto.send.message';
import { DiscussionRemoveMessageInput } from './dto/discussion.dto.remove.message';
import { CommunicationCreateDiscussionInput } from '../communication/dto/communication.dto.create.discussion';

@Injectable()
export class DiscussionService {
  constructor(
    @InjectRepository(Discussion)
    private discussionRepository: Repository<Discussion>,
    private communicationAdapterService: CommunicationAdapterService,
    private roomService: RoomService
  ) {}

  async createDiscussion(
    discussionData: CommunicationCreateDiscussionInput
  ): Promise<IDiscussion> {
    const discussion = Discussion.create(discussionData);
    return await this.discussionRepository.save(discussion);
  }

  async removeDiscussion(
    deleteData: DeleteDiscussionInput
  ): Promise<IDiscussion> {
    const discussionID = deleteData.ID;
    const discussion = await this.getDiscussionOrFail(discussionID);

    const result = await this.discussionRepository.remove(
      discussion as Discussion
    );
    result.id = discussionID;
    return result;
  }

  async getDiscussionOrFail(discussionID: string): Promise<IDiscussion> {
    const discussion = await this.discussionRepository.findOne({
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

  updateDiscussion(
    discussion: IDiscussion | undefined,
    updateDiscussionData: UpdateDiscussionInput
  ): IDiscussion {
    if (!discussion)
      throw new EntityNotFoundException(
        'No Discussion loaded',
        LogContext.CHALLENGES
      );
    if (updateDiscussionData.title)
      discussion.title = updateDiscussionData.title;
    if (updateDiscussionData.category)
      discussion.category = updateDiscussionData.category;
    return discussion;
  }

  async getDiscussionRoom(
    discussion: IDiscussion,
    communicationID: string
  ): Promise<CommunicationRoomResult> {
    const room = await this.communicationAdapterService.getCommunityRoom(
      discussion.discussionRoomID,
      communicationID
    );

    await this.roomService.populateRoomMessageSenders([room]);

    return room;
  }

  async sendMessageToDiscussion(
    discussion: IDiscussion,
    communicationID: string,
    messageData: DiscussionSendMessageInput
  ): Promise<string> {
    // await this.communicationAdapterService.ensureUserHasAccesToCommunityMessaging(
    //   communication.communicationGroupID,
    //   [discussion.discussionRoomID],
    //   communicationID
    // );
    return await this.communicationAdapterService.sendMessageToCommunityRoom({
      senderCommunicationsID: communicationID,
      message: messageData.message,
      roomID: discussion.discussionRoomID,
    });
  }

  async removeMessageFromDiscussion(
    discussion: IDiscussion,
    communicationID: string,
    messageData: DiscussionRemoveMessageInput
  ): Promise<string> {
    // await this.communicationAdapterService.ensureUserHasAccesToCommunityMessaging(
    //   communication.communicationGroupID,
    //   [discussion.discussionRoomID],
    //   communicationID
    // );
    return await this.communicationAdapterService.sendMessageToCommunityRoom({
      senderCommunicationsID: communicationID,
      message: messageData.messageId,
      roomID: discussion.discussionRoomID,
    });
  }
}
