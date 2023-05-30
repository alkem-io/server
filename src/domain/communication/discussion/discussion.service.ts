import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOneOptions, Repository } from 'typeorm';
import { EntityNotFoundException } from '@common/exceptions';
import { LogContext } from '@common/enums';
import { Discussion } from './discussion.entity';
import { IDiscussion } from './discussion.interface';
import { UpdateDiscussionInput } from './dto/discussion.dto.update';
import { DeleteDiscussionInput } from './dto/discussion.dto.delete';
import { CommunicationRoomResult } from '../room/dto/communication.dto.room.result';
import { RoomService } from '../room/room.service';
import { CommunicationCreateDiscussionInput } from '../communication/dto/communication.dto.create.discussion';
import { AuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.entity';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { RoomSendMessageInput } from '../room/dto/room.dto.send.message';
import { RoomRemoveMessageInput } from '../room/dto/room.dto.remove.message';
import { IMessage } from '../message/message.interface';
import { ProfileService } from '@domain/common/profile/profile.service';
import { NamingService } from '@services/infrastructure/naming/naming.service';
import { RestrictedTagsetNames } from '@domain/common/tagset/tagset.entity';
import { UUID_LENGTH } from '@common/constants/entity.field.length.constants';
import { RoomSendMessageReplyInput } from '../room/dto/room.dto.send.message.reply';
import { RoomAddReactionToMessageInput } from '../room/dto/room.add.reaction.to.message';
import { RoomRemoveReactionToMessageInput } from '../room/dto/room.remove.message.reaction';

@Injectable()
export class DiscussionService {
  constructor(
    @InjectRepository(Discussion)
    private discussionRepository: Repository<Discussion>,
    private profileService: ProfileService,
    private roomService: RoomService,
    private namingService: NamingService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async createDiscussion(
    discussionData: CommunicationCreateDiscussionInput,
    userID: string,
    communicationDisplayName: string
  ): Promise<IDiscussion> {
    const discussionNameID = this.namingService.createNameID(
      `${discussionData.profile.displayName}`
    );
    const discussionCreationData = {
      ...discussionData,
      nameID: discussionNameID,
    };
    const discussion: IDiscussion = Discussion.create(discussionCreationData);
    discussion.profile = await this.profileService.createProfile(
      discussionData.profile
    );

    await this.profileService.addTagsetOnProfile(discussion.profile, {
      name: RestrictedTagsetNames.DEFAULT,
      tags: discussionData.tags || [],
    });

    discussion.authorization = new AuthorizationPolicy();
    discussion.displayName = `${communicationDisplayName}-discussion-${discussion.profile.displayName}`;
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
    const discussion = await this.getDiscussionOrFail(discussionID, {
      relations: ['profile'],
    });

    if (discussion.profile) {
      await this.profileService.deleteProfile(discussion.profile.id);
    }

    const result = await this.discussionRepository.remove(
      discussion as Discussion
    );
    await this.roomService.removeRoom(discussion);
    result.id = discussionID;
    return result;
  }

  async getDiscussionOrFail(
    discussionID: string,
    options?: FindOneOptions<Discussion>
  ): Promise<IDiscussion> {
    let discussion: IDiscussion | null = null;
    if (discussionID.length === UUID_LENGTH) {
      discussion = await this.discussionRepository.findOne({
        where: { id: discussionID },
        ...options,
      });
    }
    if (!discussion) {
      // look up based on nameID
      discussion = await this.discussionRepository.findOne({
        where: { nameID: discussionID },
        ...options,
      });
    }

    if (!discussion)
      throw new EntityNotFoundException(
        `Not able to locate Discussion with the specified ID: ${discussionID}`,
        LogContext.CHALLENGES
      );
    return discussion;
  }

  async deleteDiscussion(discussionID: string): Promise<IDiscussion> {
    const discussion = await this.getDiscussionOrFail(discussionID, {
      relations: ['profile'],
    });
    if (discussion.profile) {
      await this.profileService.deleteProfile(discussion.profile.id);
    }
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
    if (updateDiscussionData.profileData) {
      discussion.profile = await this.profileService.updateProfile(
        discussion.profile,
        updateDiscussionData.profileData
      );
    }
    if (updateDiscussionData.category)
      discussion.category = updateDiscussionData.category;

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

  async sendMessageReplyToDiscussion(
    discussion: IDiscussion,
    communicationUserID: string,
    messageData: RoomSendMessageReplyInput
  ): Promise<IMessage> {
    const message = await this.roomService.sendMessageReply(
      discussion,
      communicationUserID,
      messageData
    );
    discussion.commentsCount = discussion.commentsCount + 1;
    await this.save(discussion);
    return message;
  }

  async addReactionToMessageInDiscussion(
    discussion: IDiscussion,
    communicationUserID: string,
    messageData: RoomAddReactionToMessageInput
  ): Promise<IMessage> {
    const message = await this.roomService.addReactionToMessage(
      discussion,
      communicationUserID,
      messageData
    );

    return message;
  }

  async removeReactionToMessageInDiscussion(
    discussion: IDiscussion,
    communicationUserID: string,
    messageData: RoomRemoveReactionToMessageInput
  ): Promise<boolean> {
    await this.roomService.removeReactionToMessage(
      discussion,
      communicationUserID,
      messageData
    );

    return true;
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
