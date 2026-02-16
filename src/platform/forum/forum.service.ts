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
import { DRIZZLE } from '@config/drizzle/drizzle.constants';
import type { DrizzleDb } from '@config/drizzle/drizzle.constants';
import { AuthorizationPolicy } from '@domain/common/authorization-policy';
import { IUser } from '@domain/community/user/user.interface';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { CommunicationAdapter } from '@services/adapters/communication-adapter/communication.adapter';
import { NamingService } from '@services/infrastructure/naming/naming.service';
import { StorageAggregatorResolverService } from '@services/infrastructure/storage-aggregator-resolver/storage.aggregator.resolver.service';
import { eq } from 'drizzle-orm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Discussion } from '../forum-discussion/discussion.entity';
import { IDiscussion } from '../forum-discussion/discussion.interface';
import { DiscussionService } from '../forum-discussion/discussion.service';
import { ForumCreateDiscussionInput } from './dto/forum.dto.create.discussion';
import { Forum } from './forum.entity';
import { forums } from './forum.schema';
import { IForum } from './forum.interface';

@Injectable()
export class ForumService {
  constructor(
    private discussionService: DiscussionService,
    private communicationAdapter: CommunicationAdapter,
    private storageAggregatorResolverService: StorageAggregatorResolverService,
    private namingService: NamingService,
    @Inject(DRIZZLE)
    private readonly db: DrizzleDb,
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

    return await this.save(forum);
  }

  async save(forum: IForum): Promise<IForum> {
    const [saved] = await this.db
      .insert(forums)
      .values(forum as any)
      .onConflictDoUpdate({
        target: forums.id,
        set: forum as any,
      })
      .returning();
    return saved as unknown as IForum;
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

    // Trigger a room membership request for the current user that is not awaited
    const room = await this.discussionService.getComments(discussion.id);
    await this.communicationAdapter.batchAddMember(userForumID, [room.id]);

    return discussion;
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
    options?: { relations?: Record<string, boolean> }
  ): Promise<IForum | never> {
    const with_ = options?.relations
      ? Object.fromEntries(
          Object.entries(options.relations).map(([key, value]) => [key, value])
        )
      : undefined;

    const forum = await this.db.query.forums.findFirst({
      where: eq(forums.id, forumID),
      with: with_ as any,
    });
    if (!forum)
      throw new EntityNotFoundException(
        `Unable to find Forum with ID: ${forumID}`,
        LogContext.PLATFORM_FORUM
      );
    return forum as unknown as IForum;
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

    await this.db.delete(forums).where(eq(forums.id, forumID));
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
    const forumMatches = await this.db.query.forums.findMany();
    const forumIDs: string[] = [];
    for (const forum of forumMatches) {
      forumIDs.push(forum.id);
    }
    return forumIDs;
  }

  async removeUserFromForums(forum: IForum, user: IUser): Promise<boolean> {
    if (!user.agent?.id) {
      throw new EntityNotInitializedException(
        `User ${user.id} does not have an agent`,
        LogContext.PLATFORM_FORUM
      );
    }
    // get the list of rooms to remove the user from
    const forumRoomIDs: string[] = [];
    for (const discussion of await this.getDiscussions(forum)) {
      const room = await this.discussionService.getComments(discussion.id);
      forumRoomIDs.push(room.id);
    }
    await this.communicationAdapter.batchRemoveMember(
      user.agent.id,
      forumRoomIDs
    );

    return true;
  }
}
