import { SUBSCRIPTION_DISCUSSION_UPDATED } from '@common/constants/providers';
import { AuthorizationPrivilege, LogContext } from '@common/enums';
import { ForumDiscussionCategory } from '@common/enums/forum.discussion.category';
import { SubscriptionType } from '@common/enums/subscription.type';
import { ValidationException } from '@common/exceptions/validation.exception';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { Inject, LoggerService } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { NotificationInputPlatformForumDiscussionCreated } from '@services/adapters/notification-adapter/dto/platform/notification.dto.input.platform.forum.discussion.created';
import { NotificationPlatformAdapter } from '@services/adapters/notification-adapter/notification.platform.adapter';
import { NamingService } from '@services/infrastructure/naming/naming.service';
import { InstrumentResolver } from '@src/apm/decorators';
import { CurrentActor } from '@src/common/decorators';
import { PlatformAuthorizationPolicyService } from '@src/platform/authorization/platform.authorization.policy.service';
import { PubSubEngine } from 'graphql-subscriptions';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { IDiscussion } from '../forum-discussion/discussion.interface';
import { DiscussionService } from '../forum-discussion/discussion.service';
import { DiscussionAuthorizationService } from '../forum-discussion/discussion.service.authorization';
import { ForumCreateDiscussionInput } from './dto/forum.dto.create.discussion';
import { ForumDiscussionUpdated } from './dto/forum.dto.event.discussion.updated';
import { ForumService } from './forum.service';

@InstrumentResolver()
@Resolver()
export class ForumResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private notificationPlatformAdapter: NotificationPlatformAdapter,
    private forumService: ForumService,
    private namingService: NamingService,
    private discussionAuthorizationService: DiscussionAuthorizationService,
    private discussionService: DiscussionService,
    private platformAuthorizationService: PlatformAuthorizationPolicyService,
    @Inject(SUBSCRIPTION_DISCUSSION_UPDATED)
    private readonly subscriptionDiscussionMessage: PubSubEngine,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  @Mutation(() => IDiscussion, {
    description: 'Creates a new Discussion as part of this Forum.',
  })
  async createDiscussion(
    @CurrentActor() actorContext: ActorContext,
    @Args('createData') createData: ForumCreateDiscussionInput
  ): Promise<IDiscussion> {
    const forum = await this.forumService.getForumOrFail(createData.forumID);
    await this.authorizationService.grantAccessOrFail(
      actorContext,
      forum.authorization,
      AuthorizationPrivilege.CREATE_DISCUSSION,
      `create discussion on forum: ${forum.id}`
    );

    if (createData.category === ForumDiscussionCategory.RELEASES) {
      const platformAuthorization =
        await this.platformAuthorizationService.getPlatformAuthorizationPolicy();
      await this.authorizationService.grantAccessOrFail(
        actorContext,
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

    let discussion = await this.forumService.createDiscussion(
      createData,
      actorContext.actorId,
      actorContext.actorId
    );
    discussion = await this.discussionService.save(discussion);

    const updatedDiscussions =
      await this.discussionAuthorizationService.applyAuthorizationPolicy(
        discussion,
        forum.authorization
      );
    await this.authorizationPolicyService.saveAll(updatedDiscussions);

    // Send the notification
    const notificationInput: NotificationInputPlatformForumDiscussionCreated = {
      triggeredBy: actorContext.actorId,
      discussion: discussion,
    };
    await this.notificationPlatformAdapter.platformForumDiscussionCreated(
      notificationInput
    );

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

    return await this.discussionService.getDiscussionOrFail(discussion.id);
  }
}
