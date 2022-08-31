import { CurrentUser } from '@common/decorators/current-user.decorator';
import { SubscriptionType } from '@common/enums/subscription.type';
import { AgentInfo } from '@core/authentication/agent-info';
import { GraphqlGuard } from '@core/authorization';
import { Inject, LoggerService, UseGuards } from '@nestjs/common';
import { Args, Resolver, Subscription } from '@nestjs/graphql';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { PubSubEngine } from 'graphql-subscriptions';
import { LogContext } from '@common/enums/logging.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { SUBSCRIPTION_CALLOUT_ASPECT_CREATED } from '@common/constants/providers';
import { CalloutService } from '@domain/collaboration/callout/callout.service';
import { CalloutAspectCreated } from '@domain/collaboration/callout';
import { UUID } from '@domain/common/scalars';

@Resolver()
export class CalloutResolverSubscriptions {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    @Inject(SUBSCRIPTION_CALLOUT_ASPECT_CREATED)
    private subscriptionAspectCreated: PubSubEngine,
    private calloutService: CalloutService,
    private authorizationService: AuthorizationService
  ) {}

  @UseGuards(GraphqlGuard)
  @Subscription(() => CalloutAspectCreated, {
    description:
      'Receive new Update messages on Communities the currently authenticated User is a member of.',
    async resolve(
      this: CalloutResolverSubscriptions,
      value: CalloutAspectCreated,
      _: unknown,
      context: { req: { user: AgentInfo } }
    ): Promise<CalloutAspectCreated> {
      const agentInfo = context.req.user;
      const logMsgPrefix = `[User (${agentInfo.email}) Callout Aspects] - `;
      this.logger.verbose?.(
        `${logMsgPrefix} sending out event for Aspects on Callout: ${value.calloutID} `,
        LogContext.SUBSCRIPTIONS
      );
      return value;
    },
    async filter(
      this: CalloutResolverSubscriptions,
      payload: CalloutAspectCreated,
      variables: { calloutID: string },
      context: { req: { user: AgentInfo } }
    ) {
      const agentInfo = context.req.user;
      const logMsgPrefix = `[User (${agentInfo.email}) Callout Aspects] - `;
      this.logger.verbose?.(
        `${logMsgPrefix} Filtering event '${payload.eventID}'`,
        LogContext.SUBSCRIPTIONS
      );

      const isSameCallout = payload.calloutID === variables.calloutID;
      this.logger.verbose?.(
        `${logMsgPrefix} Filter result is ${isSameCallout}`,
        LogContext.SUBSCRIPTIONS
      );
      return isSameCallout;
    },
  })
  async calloutAspectCreated(
    @CurrentUser() agentInfo: AgentInfo,
    @Args({
      name: 'calloutID',
      type: () => UUID,
      description: 'The ID of the Callout to subscribe to.',
      nullable: false,
    })
    calloutID: string
  ) {
    const logMsgPrefix = `[User (${agentInfo.email}) Callout Aspects] - `;
    this.logger.verbose?.(
      `${logMsgPrefix} Subscribing to the following Callout Aspects: ${calloutID}`,
      LogContext.SUBSCRIPTIONS
    );
    // check the user has the READ privilege
    const callout = await this.calloutService.getCalloutOrFail(calloutID);
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      callout.authorization,
      AuthorizationPrivilege.READ,
      `subscription to new Aspects on Callout: ${callout.id}`
    );

    return this.subscriptionAspectCreated.asyncIterator(
      SubscriptionType.CALLOUT_ASPECT_CREATED
    );
  }
}
