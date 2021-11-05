import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EntityNotFoundException } from '@common/exceptions';
import { LogContext } from '@common/enums';
import { Discussion } from './discussion.entity';
import { IDiscussion } from './discussion.interface';
import { UpdateDiscussionInput } from './dto/discussion.dto.update';
import { DeleteDiscussionInput } from './dto/discussion.dto.delete';
import { CommunicationRoomResult } from '../room/communication.dto.room.result';
import { CommunicationAdapter } from '@services/platform/communication-adapter/communication.adapter';
import { RoomService } from '../room/room.service';
import { CommunicationCreateDiscussionInput } from '../communication/dto/communication.dto.create.discussion';
import { AuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.entity';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { RoomSendMessageInput } from '../room/dto/room.dto.send.message';
import { RoomRemoveMessageInput } from '../room/dto/room.dto.remove.message';

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
    communicationUserID: string
  ): Promise<IDiscussion> {
    const discussion = Discussion.create(discussionData);
    discussion.authorization = new AuthorizationPolicy();
    discussion.communicationGroupID = communicationGroupID;
    await this.save(discussion);
    discussion.communicationRoomID = await this.initializeDiscussionRoom(
      discussion
    );
    // add the current user as a member
    await this.communicationAdapter.ensureUserHasAccesToRooms(
      discussion.communicationGroupID,
      [discussion.communicationRoomID],
      communicationUserID
    );
    await this.sendMessageToDiscussion(discussion, communicationUserID, {
      message: discussionData.message,
    });
    return await this.save(discussion);
  }

  async initializeDiscussionRoom(discussion: IDiscussion): Promise<string> {
    try {
      const communicationRoomID =
        await this.communicationAdapter.createCommunityRoom(
          discussion.communicationGroupID,
          `${discussion.displayName}-discussion-${discussion.title} `,
          { discussionID: discussion.id }
        );
      return communicationRoomID;
    } catch (error) {
      this.logger.error?.(
        `Unable to initialize discussion room (${discussion.title}): ${error}`,
        LogContext.COMMUNICATION
      );
    }
    return '';
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

  async updateDiscussion(
    discussion: IDiscussion,
    updateDiscussionData: UpdateDiscussionInput
  ): Promise<IDiscussion> {
    if (updateDiscussionData.title)
      discussion.title = updateDiscussionData.title;
    if (updateDiscussionData.category)
      discussion.category = updateDiscussionData.category;
    return await this.save(discussion);
  }

  async save(discussion: IDiscussion): Promise<IDiscussion> {
    return await this.discussionRepository.save(discussion);
  }

  async getDiscussionRoom(
    discussion: IDiscussion,
    communicationUserID: string
  ): Promise<CommunicationRoomResult> {
    return await this.roomService.getCommunicationRoom(
      discussion,
      communicationUserID
    );
  }

  async sendMessageToDiscussion(
    discussion: IDiscussion,
    communicationUserID: string,
    messageData: RoomSendMessageInput
  ): Promise<string> {
    return await this.roomService.sendMessage(
      discussion,
      communicationUserID,
      messageData
    );
  }

  async removeMessageFromDiscussion(
    discussion: IDiscussion,
    communicationUserID: string,
    messageData: RoomRemoveMessageInput
  ) {
    return await this.roomService.removeMessage(
      discussion,
      communicationUserID,
      messageData
    );
  }
}
