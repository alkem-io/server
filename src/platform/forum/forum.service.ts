import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  EntityNotFoundException,
  EntityNotInitializedException,
} from '@common/exceptions';
import { LogContext } from '@common/enums';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { FindOneOptions, Repository } from 'typeorm';
import { AuthorizationPolicy } from '@domain/common/authorization-policy';
import { IDiscussion } from '../forum-discussion/discussion.interface';
import { DiscussionService } from '../forum-discussion/discussion.service';
import { IUser } from '@domain/community/user/user.interface';
import { ForumCreateDiscussionInput } from './dto/forum.dto.create.discussion';
import { RoomType } from '@common/enums/room.type';
import { StorageAggregatorResolverService } from '@services/infrastructure/storage-aggregator-resolver/storage.aggregator.resolver.service';
import { DiscussionsOrderBy } from '@common/enums/discussions.orderBy';
import { Discussion } from '../forum-discussion/discussion.entity';
import { NamingService } from '@services/infrastructure/naming/naming.service';
import { Forum } from './forum.entity';
import { ForumDiscussionCategory } from '@common/enums/forum.discussion.category';
import { IForum } from './forum.interface';
import { ForumDiscussionCategoryException } from '@common/exceptions/forum.discussion.category.exception';
import { CommunicationAdapter } from '@services/adapters/communication-adapter/communication.adapter';
import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import { UserLookupService } from '@domain/community/user-lookup/user.lookup.service';

@Injectable()
export class ForumService {
  constructor(
    private discussionService: DiscussionService,
    private communicationAdapter: CommunicationAdapter,
    private storageAggregatorResolverService: StorageAggregatorResolverService,
    private namingService: NamingService,
    private userLookupService: UserLookupService,
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

    return await this.save(forum);
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

    // Trigger a room membership request for the current user that is not awaited
    const room = await this.discussionService.getComments(discussion.id);
    await this.communicationAdapter.userAddToRooms(
      [room.externalRoomID],
      userForumID
    );

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
    await this.communicationAdapter.userAddToRooms(forumRoomIDs, forumUserID);

    return true;
  }

  async getRoomsUsed(forum: IForum): Promise<string[]> {
    const forumRoomIDs: string[] = [];
    const discussions = await this.getDiscussions(forum);
    for (const discussion of discussions) {
      const room = await this.discussionService.getComments(discussion.id);
      forumRoomIDs.push(room.displayName);
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
    let agentId = user.agent?.id;
    if (!agentId) {
      const loadedUser = await this.userLookupService.getUserOrFail(user.id, {
        relations: { agent: true },
      });
      if (!loadedUser.agent) {
        throw new EntityNotInitializedException(
          `User Agent not initialized for user: ${user.id}`,
          LogContext.PLATFORM_FORUM
        );
      }
      agentId = loadedUser.agent.id;
    }

    // get the list of rooms to add the user to
    const forumRoomIDs: string[] = [];
    for (const discussion of await this.getDiscussions(forum)) {
      const room = await this.discussionService.getComments(discussion.id);
      forumRoomIDs.push(room.externalRoomID);
    }
    await this.communicationAdapter.removeUserFromRooms(forumRoomIDs, agentId);

    return true;
  }
}
