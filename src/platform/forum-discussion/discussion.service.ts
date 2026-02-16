import { LogContext, ProfileType } from '@common/enums';
import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import { RoomType } from '@common/enums/room.type';
import { TagsetReservedName } from '@common/enums/tagset.reserved.name';
import { EntityNotFoundException } from '@common/exceptions';
import { DRIZZLE } from '@config/drizzle/drizzle.constants';
import type { DrizzleDb } from '@config/drizzle/drizzle.constants';
import { AuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.entity';
import { IProfile } from '@domain/common/profile/profile.interface';
import { ProfileService } from '@domain/common/profile/profile.service';
import { IStorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.interface';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { ForumCreateDiscussionInput } from '@platform/forum/dto/forum.dto.create.discussion';
import { and, eq } from 'drizzle-orm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { IRoom } from '../../domain/communication/room/room.interface';
import { RoomService } from '../../domain/communication/room/room.service';
import { Discussion } from './discussion.entity';
import { discussions } from './discussion.schema';
import { IDiscussion } from './discussion.interface';
import { DeleteDiscussionInput } from './dto/discussion.dto.delete';
import { UpdateDiscussionInput } from './dto/discussion.dto.update';

@Injectable()
export class DiscussionService {
  constructor(
    @Inject(DRIZZLE)
    private readonly db: DrizzleDb,
    private readonly profileService: ProfileService,
    private readonly roomService: RoomService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async createDiscussion(
    discussionData: ForumCreateDiscussionInput,
    userID: string,
    communicationDisplayName: string,
    roomType: RoomType,
    storageAggregator: IStorageAggregator
  ): Promise<IDiscussion> {
    const discussion: IDiscussion = Discussion.create(discussionData as any);
    discussion.profile = await this.profileService.createProfile(
      discussionData.profile,
      ProfileType.DISCUSSION,
      storageAggregator
    );

    await this.profileService.addOrUpdateTagsetOnProfile(discussion.profile, {
      name: TagsetReservedName.DEFAULT,
      tags: discussionData.tags || [],
    });

    discussion.authorization = new AuthorizationPolicy(
      AuthorizationPolicyType.DISCUSSION
    );

    discussion.comments = await this.roomService.createRoom({
      displayName: `${communicationDisplayName}-discussion-${discussion.profile.displayName}`,
      type: roomType,
    });

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

    // Delete Room (which is a direct child of Forum Space in Matrix)
    if (discussion.comments) {
      await this.roomService.deleteRoom({
        roomID: discussion.comments.id,
      });
    }

    await this.db.delete(discussions).where(eq(discussions.id, discussionID));

    discussion.id = discussionID;
    return discussion;
  }

  async getDiscussionOrFail(
    discussionID: string,
    options?: { relations?: Record<string, boolean> }
  ): Promise<IDiscussion> {
    const with_ = options?.relations
      ? Object.fromEntries(
          Object.entries(options.relations).map(([key, value]) => [key, value])
        )
      : undefined;

    const discussion = await this.db.query.discussions.findFirst({
      where: eq(discussions.id, discussionID),
      with: with_ as any,
    });

    if (!discussion)
      throw new EntityNotFoundException(
        `Not able to locate Discussion with the specified ID: ${discussionID}`,
        LogContext.COMMUNICATION
      );
    return discussion as unknown as IDiscussion;
  }

  async updateDiscussion(
    discussion: IDiscussion,
    updateDiscussionData: UpdateDiscussionInput
  ): Promise<IDiscussion> {
    if (updateDiscussionData.profileData) {
      // Sync room name if displayName is changing
      if (
        updateDiscussionData.profileData.displayName &&
        discussion.comments &&
        discussion.profile.displayName !==
          updateDiscussionData.profileData.displayName
      ) {
        const newRoomName = `discussion-${updateDiscussionData.profileData.displayName}`;
        await this.roomService.updateRoomDisplayName(
          discussion.comments,
          newRoomName
        );
      }

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
    const [saved] = await this.db
      .insert(discussions)
      .values(discussion as any)
      .onConflictDoUpdate({
        target: discussions.id,
        set: discussion as any,
      })
      .returning();
    return saved as unknown as IDiscussion;
  }

  public async getProfile(
    discussionInput: IDiscussion,
    relations?: Record<string, boolean>
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
    const discussion = await this.db.query.discussions.findFirst({
      where: and(eq(discussions.id, discussionID), eq(discussions.forumId, forumID)),
    });
    if (discussion) return true;
    return false;
  }
}
