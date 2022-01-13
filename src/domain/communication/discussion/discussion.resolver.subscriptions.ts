import { CurrentUser } from '@common/decorators/current-user.decorator';
import { SubscriptionType } from '@common/enums/subscription.type';
import { AgentInfo } from '@core/authentication/agent-info';
import { GraphqlGuard } from '@core/authorization';
import { Inject, LoggerService, UseGuards } from '@nestjs/common';
import { Args, Resolver, Subscription } from '@nestjs/graphql';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { PubSubEngine } from 'graphql-subscriptions';
import { LogContext } from '@common/enums/logging.context';
import { UUID } from '@domain/common/scalars/scalar.uuid';
import { CommunicationDiscussionMessageReceived } from './dto/discussion.dto.event.message.received';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { DiscussionService } from './discussion.service';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { SUBSCRIPTION_DISCUSSION_MESSAGE } from '@common/constants/providers';

@Resolver()
export class DiscussionResolverSubscriptions {
  constructor(
    private authorizationService: AuthorizationService,
    private discussionService: DiscussionService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    @Inject(SUBSCRIPTION_DISCUSSION_MESSAGE)
    private subscriptionDiscussionMessage: PubSubEngine
  ) {}

  // Note: the resolving method should not be doing any heavy lifting.
  // Relies on users being cached for performance.
  @UseGuards(GraphqlGuard)
  @Subscription(() => CommunicationDiscussionMessageReceived, {
    description: 'Receive new Discussion messages',
    async resolve(
      this: DiscussionResolverSubscriptions,
      value: CommunicationDiscussionMessageReceived
    ): Promise<CommunicationDiscussionMessageReceived> {
      this.logger.verbose?.(
        `[DiscussionMsg Resolve] sending out event for Discussion message received:: ${value.discussionID} `,
        LogContext.SUBSCRIPTIONS
      );
      return value;
    },
    async filter(
      this: DiscussionResolverSubscriptions,
      payload: CommunicationDiscussionMessageReceived,
      variables: any,
      context: any
    ) {
      const discussionIDs: string[] = variables.discussionIDs;
      this.logger.verbose?.(
        `[DiscussionMsg Filter] Filtering event with list: ${discussionIDs}`,
        LogContext.SUBSCRIPTIONS
      );
      if (!discussionIDs) {
        const agentInfo = context.req?.user;
        // If subscribed to all then need to check on every update the authorization to see it as could not be done
        // on the subscription approval
        this.logger.verbose?.(
          `[DiscussionMsg Filter] User (${agentInfo.email}) subscribed to all msgs; filtering by Authorization to see ${payload.discussionID}`,
          LogContext.SUBSCRIPTIONS
        );
        const updates = await this.discussionService.getDiscussionOrFail(
          payload.discussionID
        );
        const filter = await this.authorizationService.isAccessGranted(
          agentInfo,
          updates.authorization,
          AuthorizationPrivilege.READ
        );
        this.logger.verbose?.(
          `[DiscussionMsg Filter] User (${agentInfo.email}) filter: ${filter}`,
          LogContext.SUBSCRIPTIONS
        );
        return filter;
      } else {
        // No need to do an authorization check as was done on the subscription approval
        const inList = discussionIDs.includes(payload.discussionID);
        this.logger.verbose?.(
          `[DiscussionMsg Filter] result is ${inList}`,
          LogContext.SUBSCRIPTIONS
        );
        return inList;
      }
    },
  })
  async communicationDiscussionMessageReceived(
    @CurrentUser() agentInfo: AgentInfo,
    @Args({
      name: 'discussionIDs',
      type: () => [UUID],
      description:
        'The IDs of the Discussion to subscribe to; if omitted subscribe to all Discussions.',
      nullable: true,
    })
    discussionIDs: string[]
  ) {
    if (discussionIDs) {
      this.logger.verbose?.(
        `[DiscussionMsg Request] User (${agentInfo.email}) subscribing to the following discussion: ${discussionIDs}`,
        LogContext.SUBSCRIPTIONS
      );
      for (const discussionID of discussionIDs) {
        // check the user has the READ privilege
        const updates = await this.discussionService.getDiscussionOrFail(
          discussionID
        );
        await this.authorizationService.grantAccessOrFail(
          agentInfo,
          updates.authorization,
          AuthorizationPrivilege.READ,
          `subscription to discussion on: ${updates.displayName}`
        );
      }
    } else {
      this.logger.verbose?.(
        `[DiscussionMsg Request] User (${agentInfo.email}) subscribing to all discussions`,
        LogContext.SUBSCRIPTIONS
      );

      // Todo: either disable this option or find a way to do this once in this method and pass the resulting
      // array of discussionIDs to the filter call
    }

    return this.subscriptionDiscussionMessage.asyncIterator(
      SubscriptionType.COMMUNICATION_DISCUSSION_MESSAGE_RECEIVED
    );
  }
}
