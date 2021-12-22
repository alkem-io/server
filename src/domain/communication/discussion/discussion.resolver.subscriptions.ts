import { CurrentUser } from '@common/decorators/current-user.decorator';
import { SubscriptionType } from '@common/enums/subscription.type';
import { AgentInfo } from '@core/authentication/agent-info';
import { GraphqlGuard } from '@core/authorization';
import { Inject, LoggerService, UseGuards } from '@nestjs/common';
import { Args, Resolver, Subscription } from '@nestjs/graphql';
import { SUBSCRIPTION_PUB_SUB } from '@core/microservices/microservices.module';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { PubSubEngine } from 'graphql-subscriptions';
import { LogContext } from '@common/enums/logging.context';
import { UUID } from '@domain/common/scalars/scalar.uuid';
import { CommunicationDiscussionMessageReceived } from './dto/discussion.dto.event.message.received';

@Resolver()
export class DiscussionResolverSubscriptions {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    @Inject(SUBSCRIPTION_PUB_SUB) private pubSub: PubSubEngine
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
        `subscription event for discussion: ${value.discussionID} `,
        LogContext.SUBSCRIPTIONS
      );
      return value;
    },
    async filter(
      this: DiscussionResolverSubscriptions,
      payload: CommunicationDiscussionMessageReceived,
      variables: any,
      _: any
    ) {
      const discussionIDs: string[] = variables.discussionIDs;
      this.logger.verbose?.(
        `[Subscription] Filtering event with list: ${discussionIDs}`,
        LogContext.SUBSCRIPTIONS
      );
      if (!discussionIDs) return true;
      const inList = discussionIDs.includes(payload.discussionID);
      return inList;
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
        `[Subscription] User (${agentInfo.email}) subscribing to the following discussion: ${discussionIDs}`,
        LogContext.SUBSCRIPTIONS
      );
    } else {
      this.logger.verbose?.(
        `[Subscription] User (${agentInfo.email}) subscribing to all discussions`,
        LogContext.SUBSCRIPTIONS
      );
    }

    // Todo: check the user has access to all the requested Discussion

    return this.pubSub.asyncIterator(
      SubscriptionType.COMMUNICATION_DISCUSSION_MESSAGE_RECEIVED
    );
  }
}
