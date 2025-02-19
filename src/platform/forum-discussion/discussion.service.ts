import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { FindOneOptions, FindOptionsRelations, Repository } from 'typeorm';
import { EntityNotFoundException } from '@common/exceptions';
import { LogContext, ProfileType } from '@common/enums';
import { Discussion } from './discussion.entity';
import { IDiscussion } from './discussion.interface';
import { UpdateDiscussionInput } from './dto/discussion.dto.update';
import { DeleteDiscussionInput } from './dto/discussion.dto.delete';
import { RoomService } from '../../domain/communication/room/room.service';
import { AuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.entity';
import { ProfileService } from '@domain/common/profile/profile.service';
import { IRoom } from '../../domain/communication/room/room.interface';
import { RoomType } from '@common/enums/room.type';
import { IProfile } from '@domain/common/profile/profile.interface';
import { TagsetReservedName } from '@common/enums/tagset.reserved.name';
import { IStorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.interface';
import { ForumCreateDiscussionInput } from '@platform/forum/dto/forum.dto.create.discussion';
import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';

@Injectable()
export class DiscussionService {
  constructor(
    @InjectRepository(Discussion)
    private discussionRepository: Repository<Discussion>,
    private profileService: ProfileService,
    private roomService: RoomService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async createDiscussion(
    discussionData: ForumCreateDiscussionInput,
    userID: string,
    communicationDisplayName: string,
    roomType: RoomType,
    storageAggregator: IStorageAggregator
  ): Promise<IDiscussion> {
    const discussion: IDiscussion = Discussion.create(discussionData);
    discussion.profile = await this.profileService.createProfile(
      discussionData.profile,
      ProfileType.DISCUSSION,
      storageAggregator
    );

    await this.profileService.addTagsetOnProfile(discussion.profile, {
      name: TagsetReservedName.DEFAULT,
      tags: discussionData.tags || [],
    });

    discussion.authorization = new AuthorizationPolicy(
      AuthorizationPolicyType.DISCUSSION
    );

    discussion.comments = await this.roomService.createRoom(
      `${communicationDisplayName}-discussion-${discussion.profile.displayName}`,
      roomType
    );

    discussion.createdBy = userID;

    return await this.save(discussion);
  }

  async removeDiscussion(
    deleteData: DeleteDiscussionInput
  ): Promise<IDiscussion> {
    const discussionID = deleteData.ID;
    const discussion = await this.getDiscussionOrFail(discussionID, {
      relations: { profile: true, comments: true },
    });

    if (discussion.profile) {
      await this.profileService.deleteProfile(discussion.profile.id);
    }

    if (discussion.comments) {
      await this.roomService.deleteRoom(discussion.comments);
    }

    const result = await this.discussionRepository.remove(
      discussion as Discussion
    );

    result.id = discussionID;
    return result;
  }

  async getDiscussionOrFail(
    discussionID: string,
    options?: FindOneOptions<Discussion>
  ): Promise<IDiscussion> {
    const discussion = await this.discussionRepository.findOne({
      where: { id: discussionID },
      ...options,
    });

    if (!discussion)
      throw new EntityNotFoundException(
        `Not able to locate Discussion with the specified ID: ${discussionID}`,
        LogContext.COMMUNICATION
      );
    return discussion;
  }

  async deleteDiscussion(discussionID: string): Promise<IDiscussion> {
    const discussion = await this.getDiscussionOrFail(discussionID, {
      relations: { profile: true },
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

  public async getProfile(
    discussionInput: IDiscussion,
    relations?: FindOptionsRelations<IDiscussion>
  ): Promise<IProfile> {
    const discussion = await this.getDiscussionOrFail(discussionInput.id, {
      relations: { profile: true, ...relations },
    });
    if (!discussion.profile)
      throw new EntityNotFoundException(
        `Discussion profile not initialised: ${discussionInput.id}`,
        LogContext.COLLABORATION
      );

    return discussion.profile;
  }

  public async getComments(discussionID: string): Promise<IRoom> {
    const discussionWithComments = await this.getDiscussionOrFail(
      discussionID,
      {
        relations: { comments: true },
      }
    );
    const room = discussionWithComments.comments;
    if (!room)
      throw new EntityNotFoundException(
        `Not able to locate comments room on Discussion with the specified ID: ${discussionID}`,
        LogContext.COMMUNICATION
      );
    return room;
  }

  async isDiscussionInForum(
    discussionID: string,
    forumID: string
  ): Promise<boolean> {
    const discussion = await this.discussionRepository
      .createQueryBuilder('discussion')
      .where('discussion.id = :discussionID')
      .andWhere('discussion.forumId = :forumID')
      .setParameters({
        discussionID: `${discussionID}`,
        forumID: `${forumID}`,
      })
      .getOne();
    if (discussion) return true;
    return false;
  }
}
