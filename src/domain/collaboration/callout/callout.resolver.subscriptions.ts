import { CurrentUser } from '@common/decorators/current-user.decorator';
import { SubscriptionType } from '@common/enums/subscription.type';
import { AgentInfo } from '@core/authentication/agent-info';
import { GraphqlGuard } from '@core/authorization';
import { Inject, LoggerService, UseGuards } from '@nestjs/common';
import { Args, Resolver } from '@nestjs/graphql';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { PubSubEngine } from 'graphql-subscriptions';
import { LogContext } from '@common/enums/logging.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { SUBSCRIPTION_CALLOUT_POST_CREATED } from '@common/constants/providers';
import { CalloutService } from '@domain/collaboration/callout/callout.service';
import { UUID } from '@domain/common/scalars';
import { TypedSubscription } from '@common/decorators/typed.subscription/typed.subscription.decorator';
import { CalloutPostCreatedArgs } from './dto/callout.args.post.created';
import { CalloutPostCreated, CalloutPostCreatedPayload } from './dto';
import { UnableToSubscribeException } from '@src/common/exceptions';
import { CalloutType } from '@common/enums/callout.type';

@Resolver()
export class CalloutResolverSubscriptions {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    @Inject(SUBSCRIPTION_CALLOUT_POST_CREATED)
    private subscriptionPostCreated: PubSubEngine,
    private calloutService: CalloutService,
    private authorizationService: AuthorizationService
  ) {}

  @UseGuards(GraphqlGuard)
  @TypedSubscription<CalloutPostCreatedPayload, CalloutPostCreatedArgs>(
    () => CalloutPostCreated,
    {
      description:
        'Receive new Update messages on Communities the currently authenticated User is a member of.',
      resolve(this: CalloutResolverSubscriptions, payload, args, context) {
        const agentInfo = context.req.user;
        const logMsgPrefix = `[User (${agentInfo.email}) Callout Posts] - `;
        this.logger.verbose?.(
          `${logMsgPrefix} sending out event for Posts on Callout: ${payload.calloutID} `,
          LogContext.SUBSCRIPTIONS
        );

        return {
          ...payload,
          post: {
            ...payload.post,
            createdDate: new Date(payload.post.createdDate),
          },
        };
      },
      filter(this: CalloutResolverSubscriptions, payload, variables, context) {
        const agentInfo = context.req.user;
        const logMsgPrefix = `[User (${agentInfo.email}) Callout Posts] - `;
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
    }
  )
  async calloutPostCreated(
    @CurrentUser() agentInfo: AgentInfo,
    @Args({
      name: 'calloutID',
      type: () => UUID,
      description: 'The ID of the Callout to subscribe to.',
      nullable: false,
    })
    calloutID: string
  ) {
    const logMsgPrefix = `[User (${agentInfo.email}) Callout Posts] - `;
    this.logger.verbose?.(
      `${logMsgPrefix} Subscribing to the following Callout Posts: ${calloutID}`,
      LogContext.SUBSCRIPTIONS
    );
    // Validate
    const callout = await this.calloutService.getCalloutOrFail(calloutID);
    if (callout.type !== CalloutType.POST_COLLECTION) {
      throw new UnableToSubscribeException(
        `Unable to subscribe: Callout not of type Post: ${calloutID}`,
        LogContext.SUBSCRIPTIONS
      );
    }
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      callout.authorization,
      AuthorizationPrivilege.READ,
      `subscription to new Posts on Callout: ${callout.id}`
    );

    return this.subscriptionPostCreated.asyncIterator(
      SubscriptionType.CALLOUT_POST_CREATED
    );
  }
}
