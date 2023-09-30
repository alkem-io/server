import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  FindOneOptions,
  FindOptionsRelationByString,
  Repository,
} from 'typeorm';
import { EntityNotFoundException } from '@common/exceptions';
import { LogContext } from '@common/enums';
import { Discussion } from './discussion.entity';
import { IDiscussion } from './discussion.interface';
import { UpdateDiscussionInput } from './dto/discussion.dto.update';
import { DeleteDiscussionInput } from './dto/discussion.dto.delete';
import { RoomService } from '../room/room.service';
import { CommunicationCreateDiscussionInput } from '../communication/dto/communication.dto.create.discussion';
import { AuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.entity';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { ProfileService } from '@domain/common/profile/profile.service';
import { NamingService } from '@services/infrastructure/naming/naming.service';
import { UUID_LENGTH } from '@common/constants/entity.field.length.constants';
import { IRoom } from '../room/room.interface';
import { RoomType } from '@common/enums/room.type';
import { IProfile } from '@domain/common/profile/profile.interface';
import { TagsetReservedName } from '@common/enums/tagset.reserved.name';
import { IStorageBucket } from '@domain/storage/storage-bucket/storage.bucket.interface';

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
    communicationDisplayName: string,
    roomType: RoomType,
    parentStorageBucket: IStorageBucket
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
      discussionData.profile,
      parentStorageBucket
    );

    await this.profileService.addTagsetOnProfile(discussion.profile, {
      name: TagsetReservedName.DEFAULT,
      tags: discussionData.tags || [],
    });

    discussion.authorization = new AuthorizationPolicy();

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
      relations: ['profile', 'comments'],
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
        LogContext.COMMUNICATION
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

  public async getProfile(
    discussionInput: IDiscussion,
    relations: FindOptionsRelationByString = []
  ): Promise<IProfile> {
    const discussion = await this.getDiscussionOrFail(discussionInput.id, {
      relations: ['profile', ...relations],
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
        relations: ['comments'],
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
