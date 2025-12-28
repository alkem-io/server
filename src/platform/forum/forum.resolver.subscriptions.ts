import { CurrentUser } from '@common/decorators/current-user.decorator';
import { SubscriptionType } from '@common/enums/subscription.type';
import { ActorContext } from '@core/actor-context';
import { Inject, LoggerService } from '@nestjs/common';
import { Args, Resolver, Subscription } from '@nestjs/graphql';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { PubSubEngine } from 'graphql-subscriptions';
import { LogContext } from '@common/enums/logging.context';
import { UUID } from '@domain/common/scalars/scalar.uuid';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { SUBSCRIPTION_DISCUSSION_UPDATED } from '@common/constants/providers';
import { IDiscussion } from '../forum-discussion/discussion.interface';
import { DiscussionService } from '../forum-discussion/discussion.service';
import { ForumService } from './forum.service';
import { ForumDiscussionUpdated } from './dto/forum.dto.event.discussion.updated';
import { UUID_LENGTH } from '@common/constants';
import { SubscriptionUserNotAuthenticated } from '@common/exceptions/subscription.user.not.authenticated';
import { InstrumentResolver } from '@src/apm/decorators';

@InstrumentResolver()
@Resolver()
export class ForumResolverSubscriptions {
  constructor(
    private authorizationService: AuthorizationService,
    private forumService: ForumService,
    private discussionService: DiscussionService,
    @Inject(SUBSCRIPTION_DISCUSSION_UPDATED)
    private subscriptionDiscussionUpdated: PubSubEngine,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  @Subscription(() => IDiscussion, {
    description: 'Receive updates on Discussions',
    async resolve(
      this: ForumResolverSubscriptions,
      payload: ForumDiscussionUpdated,
      _: any,
      context: any
    ): Promise<IDiscussion> {
      const actorContext = context.req?.user;
      this.logger.verbose?.(
        `[User (${actorContext.actorId}) Discussion Update] - Sending out event: ${payload.eventID} `,
        LogContext.SUBSCRIPTIONS
      );
      return await this.discussionService.getDiscussionOrFail(
        payload.discussionID
      );
    },

    async filter(
      this: ForumResolverSubscriptions,
      payload: ForumDiscussionUpdated,
      variables: any,
      context: any
    ) {
      const actorContext = context.req?.user;
      const isMatch = await this.discussionService.isDiscussionInForum(
        payload.discussionID,
        variables.forumID
      );
      this.logger.verbose?.(
        `[User (${actorContext.actorId}) Discussion Update] - Filtering event id '${payload.eventID}' - match? ${isMatch}`,
        LogContext.SUBSCRIPTIONS
      );
      return isMatch;
    },
  })
  async forumDiscussionUpdated(
    @CurrentUser() actorContext: ActorContext,
    @Args({
      name: 'forumID',
      type: () => UUID,
      description: 'The IDs of the Forum to subscribe to all updates on.',
    })
    forumID: string
  ) {
    // Only allow subscriptions for logged in users
    if (actorContext.actorId.length !== UUID_LENGTH) {
      throw new SubscriptionUserNotAuthenticated(
        'Subscription attempted to DiscussionsUpdated for non-authenticated user',
        LogContext.SUBSCRIPTIONS
      );
    }
    const logMsgPrefix = `[User (${actorContext.actorId}) Discussion Update] - `;
    this.logger.verbose?.(
      `${logMsgPrefix} Subscribing to Discussions on Forum: ${forumID}`,
      LogContext.SUBSCRIPTIONS
    );

    const forum = await this.forumService.getForumOrFail(forumID);
    await this.authorizationService.grantAccessOrFail(
      actorContext,
      forum.authorization,
      AuthorizationPrivilege.READ,
      `subscription to discussion updates on: ${forum.id}`
    );

    return this.subscriptionDiscussionUpdated.asyncIterableIterator(
      SubscriptionType.FORUM_DISCUSSION_UPDATED
    );
  }
}
