import { JoinRulePublic } from '@alkemio/matrix-adapter-lib';
import { LogContext } from '@common/enums';
import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import { DiscussionsOrderBy } from '@common/enums/discussions.orderBy';
import { ForumDiscussionCategory } from '@common/enums/forum.discussion.category';
import { RoomType } from '@common/enums/room.type';
import {
  EntityNotFoundException,
  EntityNotInitializedException,
} from '@common/exceptions';
import { ForumDiscussionCategoryException } from '@common/exceptions/forum.discussion.category.exception';
import { FORUM_CATEGORY_NAMESPACE } from '@constants/forum.constants';
import { AuthorizationPolicy } from '@domain/common/authorization-policy';
import { IUser } from '@domain/community/user/user.interface';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CommunicationAdapter } from '@services/adapters/communication-adapter/communication.adapter';
import { NamingService } from '@services/infrastructure/naming/naming.service';
import { StorageAggregatorResolverService } from '@services/infrastructure/storage-aggregator-resolver/storage.aggregator.resolver.service';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { FindOneOptions, Repository } from 'typeorm';
import { v5 as uuidv5 } from 'uuid';
import { Discussion } from '../forum-discussion/discussion.entity';
import { IDiscussion } from '../forum-discussion/discussion.interface';
import { DiscussionService } from '../forum-discussion/discussion.service';
import { ForumCreateDiscussionInput } from './dto/forum.dto.create.discussion';
import { Forum } from './forum.entity';
import { IForum } from './forum.interface';

// Custom state event to hide spaces/rooms from Element sync responses
const INVISIBLE_STATE = { 'io.alkemio.visibility': { visible: false } };

@Injectable()
export class ForumService {
  constructor(
    private discussionService: DiscussionService,
    private communicationAdapter: CommunicationAdapter,
    private storageAggregatorResolverService: StorageAggregatorResolverService,
    private namingService: NamingService,
    @InjectRepository(Forum)
    private forumRepository: Repository<Forum>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async createForum(
    discussionCategories: ForumDiscussionCategory[]
  ): Promise<IForum> {
    const forum: IForum = new Forum();
    forum.authorization = new AuthorizationPolicy(
      AuthorizationPolicyType.FORUM
    );

    forum.discussions = [];
    forum.discussionCategories = discussionCategories;

    const savedForum = await this.save(forum);

    // Create forum Matrix space + all category Matrix spaces
    await this.createForumMatrixSpaces(savedForum);

    return savedForum;
  }

  /**
   * Create the forum Matrix space and all category Matrix spaces.
   * Called during forum creation and idempotent for re-runs.
   */
  private async createForumMatrixSpaces(forum: IForum): Promise<void> {
    try {
      await this.communicationAdapter.createSpace(
        forum.id,
        'Forum',
        undefined,
        undefined,
        JoinRulePublic,
        true,
        INVISIBLE_STATE
      );

      for (const category of forum.discussionCategories) {
        const categoryContextId = this.getCategoryContextId(forum.id, category);
        await this.communicationAdapter.createSpace(
          categoryContextId,
          category,
          forum.id,
          undefined,
          JoinRulePublic,
          true,
          INVISIBLE_STATE
        );
      }
    } catch (error) {
      this.logger.warn?.(
        {
          message: 'Failed to create Matrix spaces for forum — continuing',
          forumId: forum.id,
          error: error instanceof Error ? error.message : String(error),
        },
        LogContext.PLATFORM_FORUM
      );
    }
  }

  async save(forum: IForum): Promise<IForum> {
    return await this.forumRepository.save(forum);
  }

  async createDiscussion(
    discussionData: ForumCreateDiscussionInput,
    userID: string,
    userForumID: string
  ): Promise<IDiscussion> {
    const displayName = discussionData.profile.displayName;
    const forumID = discussionData.forumID;

    this.logger.verbose?.(
      `[Discussion] Adding discussion (${displayName}) to Forum (${forumID})`,
      LogContext.PLATFORM_FORUM
    );

    // Try to find the Forum
    const forum = await this.getForumOrFail(forumID, {
      relations: {},
    });

    if (!forum.discussionCategories.includes(discussionData.category)) {
      throw new ForumDiscussionCategoryException(
        `Invalid discussion category supplied ('${discussionData.category}'), allowed categories: ${forum.discussionCategories}`,
        LogContext.PLATFORM_FORUM
      );
    }

    const storageAggregator =
      await this.storageAggregatorResolverService.getStorageAggregatorForForum();
    const reservedNameIDs = await this.namingService.getReservedNameIDsInForum(
      forum.id
    );
    discussionData.nameID =
      this.namingService.createNameIdAvoidingReservedNameIDs(
        `${discussionData.profile.displayName}`,
        reservedNameIDs
      );
    let discussion = await this.discussionService.createDiscussion(
      discussionData,
      userID,
      'platform-forum',
      RoomType.DISCUSSION_FORUM,
      storageAggregator
    );
    this.logger.verbose?.(
      `[Discussion] Room created (${displayName}) and membership replicated from Updates (${forumID})`,
      LogContext.PLATFORM_FORUM
    );
    discussion.forum = forum;

    discussion = await this.discussionService.save(discussion);

    // Ensure forum/category Matrix space hierarchy and anchor the discussion room
    try {
      const categoryContextId = this.getCategoryContextId(
        forum.id,
        discussionData.category
      );
      await this.ensureForumMatrixHierarchy(
        forum.id,
        discussionData.category,
        categoryContextId
      );
      // Anchor the discussion room under the category Matrix space
      if (discussion.comments) {
        await this.communicationAdapter.setParent(
          discussion.comments.id,
          false,
          categoryContextId
        );
      }
    } catch (error) {
      this.logger.warn?.(
        {
          message:
            'Failed to set up Matrix hierarchy for forum discussion — continuing',
          discussionId: discussion.id,
          error: error instanceof Error ? error.message : String(error),
        },
        LogContext.PLATFORM_FORUM
      );
    }

    // Trigger a room membership request for the current user that is not awaited
    const room = await this.discussionService.getComments(discussion.id);
    await this.communicationAdapter.batchAddMember(userForumID, [room.id]);

    return discussion;
  }

  /**
   * Generate a deterministic UUID v5 context ID for a forum category.
   */
  private getCategoryContextId(forumId: string, categoryName: string): string {
    return uuidv5(
      `${forumId}:category:${categoryName}`,
      FORUM_CATEGORY_NAMESPACE
    );
  }

  /**
   * Ensure that the forum and category Matrix spaces exist in the hierarchy.
   * Creates them if missing (idempotent via adapter).
   */
  private async ensureForumMatrixHierarchy(
    forumId: string,
    categoryName: string,
    categoryContextId: string
  ): Promise<void> {
    // Ensure forum Matrix space exists (top-level, publicly joinable)
    const existingForumSpace =
      await this.communicationAdapter.getSpace(forumId);
    if (!existingForumSpace) {
      await this.communicationAdapter.createSpace(
        forumId,
        'Forum',
        undefined, // no parent — platform-level
        undefined,
        JoinRulePublic,
        true,
        INVISIBLE_STATE
      );
    }

    // Ensure category Matrix space exists under the forum
    const existingCategorySpace =
      await this.communicationAdapter.getSpace(categoryContextId);
    if (!existingCategorySpace) {
      await this.communicationAdapter.createSpace(
        categoryContextId,
        categoryName,
        forumId,
        undefined,
        JoinRulePublic,
        true,
        INVISIBLE_STATE
      );
    }
  }

  public async getDiscussions(
    forum: IForum,
    limit?: number,
    orderBy: DiscussionsOrderBy = DiscussionsOrderBy.DISCUSSIONS_CREATEDATE_DESC
  ): Promise<IDiscussion[]> {
    const forumWithDiscussions = await this.getForumOrFail(forum.id, {
      relations: { discussions: true },
    });
    const discussions = forumWithDiscussions.discussions;
    if (!discussions)
      throw new EntityNotInitializedException(
        `Unable to load Discussions for Forum: ${forum.id} `,
        LogContext.PLATFORM_FORUM
      );

    const sortedDiscussions = (discussions as Discussion[]).sort((a, b) => {
      switch (orderBy) {
        case DiscussionsOrderBy.DISCUSSIONS_CREATEDATE_ASC:
          return a.createdDate.getTime() - b.createdDate.getTime();
        case DiscussionsOrderBy.DISCUSSIONS_CREATEDATE_DESC:
          return b.createdDate.getTime() - a.createdDate.getTime();
      }
      return 0;
    });
    return limit && limit > 0
      ? sortedDiscussions.slice(0, limit)
      : sortedDiscussions;
  }

  async getDiscussionOrFail(
    forum: IForum,
    discussionID: string
  ): Promise<IDiscussion> {
    const discussion = await this.discussionService.getDiscussionOrFail(
      discussionID,
      {
        relations: { forum: true },
      }
    );
    // Check the requested discussion is in the forum
    if (!discussion.forum || !(discussion.forum.id === forum.id)) {
      throw new EntityNotFoundException(
        `Unable to find Forum for Discussion with ID: ${discussionID}`,
        LogContext.PLATFORM_FORUM
      );
    }
    return discussion;
  }

  async getForumOrFail(
    forumID: string,
    options?: FindOneOptions<Forum>
  ): Promise<IForum | never> {
    const forum = await this.forumRepository.findOne({
      where: {
        id: forumID,
      },
      ...options,
    });
    if (!forum)
      throw new EntityNotFoundException(
        `Unable to find Forum with ID: ${forumID}`,
        LogContext.PLATFORM_FORUM
      );
    return forum;
  }

  async removeForum(forumID: string): Promise<boolean> {
    // Note need to load it in with all contained entities so can remove fully
    const forum = await this.getForumOrFail(forumID, {
      relations: { discussions: true },
    });

    // Remove all groups
    for (const discussion of await this.getDiscussions(forum)) {
      await this.discussionService.removeDiscussion({
        ID: discussion.id,
      });
    }

    await this.forumRepository.remove(forum as Forum);
    return true;
  }

  async addUserToForums(forum: IForum, forumUserID: string): Promise<boolean> {
    const forumRoomIDs = await this.getRoomsUsed(forum);
    await this.communicationAdapter.batchAddMember(forumUserID, forumRoomIDs);

    return true;
  }

  async getRoomsUsed(forum: IForum): Promise<string[]> {
    const forumRoomIDs: string[] = [];
    const discussions = await this.getDiscussions(forum);
    for (const discussion of discussions) {
      const room = await this.discussionService.getComments(discussion.id);
      forumRoomIDs.push(room.id);
    }
    return forumRoomIDs;
  }

  async getForumIDsUsed(): Promise<string[]> {
    const forumMatches = await this.forumRepository
      .createQueryBuilder('forum')
      .getMany();
    const forumIDs: string[] = [];
    for (const forum of forumMatches) {
      forumIDs.push(forum.id);
    }
    return forumIDs;
  }

  async removeUserFromForums(forum: IForum, user: IUser): Promise<boolean> {
    // get the list of rooms to remove the user from
    const forumRoomIDs: string[] = [];
    for (const discussion of await this.getDiscussions(forum)) {
      const room = await this.discussionService.getComments(discussion.id);
      forumRoomIDs.push(room.id);
    }
    await this.communicationAdapter.batchRemoveMember(user.id, forumRoomIDs);

    return true;
  }
}
