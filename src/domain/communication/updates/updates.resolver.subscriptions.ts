import { CurrentUser } from '@common/decorators/current-user.decorator';
import { SubscriptionType } from '@common/enums/subscription.type';
import { AgentInfo } from '@core/authentication/agent-info';
import { GraphqlGuard } from '@core/authorization';
import { Inject, LoggerService, UseGuards } from '@nestjs/common';
import { Args, Resolver, Subscription } from '@nestjs/graphql';
import { SUBSCRIPTION_PUB_SUB } from '@core/microservices/microservices.module';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { PubSubEngine } from 'graphql-subscriptions';
import { CommunicationUpdateMessageReceived } from './dto/updates.dto.event.message.received';
import { LogContext } from '@common/enums/logging.context';
import { UUID } from '@domain/common/scalars/scalar.uuid';

@Resolver()
export class UpdatesResolverSubscriptions {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    @Inject(SUBSCRIPTION_PUB_SUB) private pubSub: PubSubEngine
  ) {}

  // Note: the resolving method should not be doing any heavy lifting.
  // Relies on users being cached for performance.
  @UseGuards(GraphqlGuard)
  @Subscription(() => CommunicationUpdateMessageReceived, {
    description:
      'Receive new Update messages on Communities the currently authenticated User is a member of.',
    async resolve(
      this: UpdatesResolverSubscriptions,
      value: CommunicationUpdateMessageReceived
    ): Promise<CommunicationUpdateMessageReceived> {
      this.logger.verbose?.(
        `subscription event for updates: ${value.updatesID} `,
        LogContext.SUBSCRIPTIONS
      );
      return value;
    },
    async filter(
      this: UpdatesResolverSubscriptions,
      payload: CommunicationUpdateMessageReceived,
      variables: any,
      _: any
    ) {
      const updatesIDs: string[] = variables.updatesIDs;
      this.logger.verbose?.(
        `[Subscription] Filtering event with list: ${updatesIDs}`,
        LogContext.SUBSCRIPTIONS
      );
      if (!updatesIDs) return true;
      const inList = updatesIDs.includes(payload.updatesID);
      return inList;
    },
  })
  async communicationUpdateMessageReceived(
    @CurrentUser() agentInfo: AgentInfo,
    @Args({
      name: 'updatesIDs',
      type: () => [UUID],
      description:
        'The IDs of the Updates to subscribe to; if omitted subscribe to all Updates.',
      nullable: true,
    })
    updatesIDs: string[]
  ) {
    if (updatesIDs) {
      this.logger.verbose?.(
        `[Subscription] User (${agentInfo.email}) subscribing to the following updates: ${updatesIDs}`,
        LogContext.SUBSCRIPTIONS
      );
    } else {
      this.logger.verbose?.(
        `[Subscription] User (${agentInfo.email}) subscribing to all updates`,
        LogContext.SUBSCRIPTIONS
      );
    }

    // Todo: check the user has access to all the requested Updates

    return this.pubSub.asyncIterator(
      SubscriptionType.COMMUNICATION_UPDATE_MESSAGE_RECEIVED
    );
  }
}
