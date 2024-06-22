import { Inject, LoggerService, UseGuards } from '@nestjs/common';
import { Resolver } from '@nestjs/graphql';
import { Args, Mutation } from '@nestjs/graphql';
import { ForumService } from './forum.service';
import { CurrentUser } from '@src/common/decorators';
import { GraphqlGuard } from '@core/authorization';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPrivilege, LogContext } from '@common/enums';
import { IDiscussion } from '../forum-discussion/discussion.interface';
import { ForumCreateDiscussionInput } from './dto/forum.dto.create.discussion';
import { DiscussionService } from '../forum-discussion/discussion.service';
import { DiscussionAuthorizationService } from '../forum-discussion/discussion.service.authorization';
import { SUBSCRIPTION_DISCUSSION_UPDATED } from '@common/constants/providers';
import { PubSubEngine } from 'graphql-subscriptions';
import { ForumDiscussionUpdated } from './dto/forum.dto.event.discussion.updated';
import { SubscriptionType } from '@common/enums/subscription.type';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { NotificationAdapter } from '@services/adapters/notification-adapter/notification.adapter';
import { NotificationInputForumDiscussionCreated } from '@services/adapters/notification-adapter/dto/notification.dto.input.discussion.created';
import { PlatformAuthorizationPolicyService } from '@src/platform/authorization/platform.authorization.policy.service';
import { ValidationException } from '@common/exceptions/validation.exception';
import { NamingService } from '@services/infrastructure/naming/naming.service';
import { ForumDiscussionCategory } from '@common/enums/forum.discussion.category';

@Resolver()
export class ForumResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private notificationAdapter: NotificationAdapter,
    private forumService: ForumService,
    private namingService: NamingService,
    private discussionAuthorizationService: DiscussionAuthorizationService,
    private discussionService: DiscussionService,
    private platformAuthorizationService: PlatformAuthorizationPolicyService,
    @Inject(SUBSCRIPTION_DISCUSSION_UPDATED)
    private readonly subscriptionDiscussionMessage: PubSubEngine,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  @UseGuards(GraphqlGuard)
  @Mutation(() => IDiscussion, {
    description: 'Creates a new Discussion as part of this Forum.',
  })
  async createDiscussion(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('createData') createData: ForumCreateDiscussionInput
  ): Promise<IDiscussion> {
    const forum = await this.forumService.getForumOrFail(createData.forumID);
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      forum.authorization,
      AuthorizationPrivilege.CREATE_DISCUSSION,
      `create discussion on forum: ${forum.id}`
    );

    if (createData.category === ForumDiscussionCategory.RELEASES) {
      const platformAuthorization =
        await this.platformAuthorizationService.getPlatformAuthorizationPolicy();
      await this.authorizationService.grantAccessOrFail(
        agentInfo,
        platformAuthorization,
        AuthorizationPrivilege.PLATFORM_ADMIN,
        `User not authorized to create discussion with ${ForumDiscussionCategory.RELEASES} category.`
      );
    }

    const displayNameAvailable =
      await this.namingService.isDiscussionDisplayNameAvailableInForum(
        createData.profile.displayName,
        forum.id
      );
    if (!displayNameAvailable)
      throw new ValidationException(
        `Unable to create Discussion: the provided displayName is already taken: ${createData.profile.displayName}`,
        LogContext.SPACES
      );

    const discussion = await this.forumService.createDiscussion(
      createData,
      agentInfo.userID,
      agentInfo.communicationID
    );

    const savedDiscussion = await this.discussionService.save(discussion);
    await this.discussionAuthorizationService.applyAuthorizationPolicy(
      discussion,
      forum.authorization
    );

    // Send the notification
    const notificationInput: NotificationInputForumDiscussionCreated = {
      triggeredBy: agentInfo.userID,
      discussion: discussion,
    };
    await this.notificationAdapter.forumDiscussionCreated(notificationInput);

    // Send out the subscription event
    const eventID = `discussion-message-updated-${Math.floor(
      Math.random() * 100
    )}`;
    const subscriptionPayload: ForumDiscussionUpdated = {
      eventID: eventID,
      discussionID: discussion.id,
    };
    this.logger.verbose?.(
      `[Discussion updated] - event published: '${eventID}'`,
      LogContext.SUBSCRIPTIONS
    );
    this.subscriptionDiscussionMessage.publish(
      SubscriptionType.FORUM_DISCUSSION_UPDATED,
      subscriptionPayload
    );

    return savedDiscussion;
  }
}
