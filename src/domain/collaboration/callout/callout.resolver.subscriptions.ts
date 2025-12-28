import { CurrentUser } from '@common/decorators/current-user.decorator';
import { SubscriptionType } from '@common/enums/subscription.type';
import { ActorContext } from '@core/actor-context';
import { Inject, LoggerService } from '@nestjs/common';
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
import { CalloutContributionType } from '@common/enums/callout.contribution.type';
import { InstrumentResolver } from '@src/apm/decorators';

@InstrumentResolver()
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

  @TypedSubscription<CalloutPostCreatedPayload, CalloutPostCreatedArgs>(
    () => CalloutPostCreated,
    {
      description:
        'Receive new Update messages on Communities the currently authenticated User is a member of.',
      resolve(this: CalloutResolverSubscriptions, payload, args, context) {
        const actorContext = context.req.user;
        const logMsgPrefix = `[User (${actorContext.actorId}) Callout Post Collection] - `;
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
        const actorContext = context.req.user;
        const logMsgPrefix = `[User (${actorContext.actorId}) Callout Post Collection] - `;
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
    @CurrentUser() actorContext: ActorContext,
    @Args({
      name: 'calloutID',
      type: () => UUID,
      description: 'The ID of the Callout to subscribe to.',
      nullable: false,
    })
    calloutID: string
  ) {
    const logMsgPrefix = `[User (${actorContext.actorId}) Callout Post Collection] - `;
    this.logger.verbose?.(
      `${logMsgPrefix} Subscribing to the Callout of type Post Collection: ${calloutID}`,
      LogContext.SUBSCRIPTIONS
    );
    // Validate
    const callout = await this.calloutService.getCalloutOrFail(calloutID);
    if (
      !callout.settings.contribution.allowedTypes.includes(
        CalloutContributionType.POST
      )
    ) {
      throw new UnableToSubscribeException(
        `Unable to subscribe: Callout does not allow Post contributions: ${calloutID}`,
        LogContext.SUBSCRIPTIONS
      );
    }
    await this.authorizationService.grantAccessOrFail(
      actorContext,
      callout.authorization,
      AuthorizationPrivilege.READ,
      `subscription to new Posts on Callout: ${callout.id}`
    );

    return this.subscriptionPostCreated.asyncIterableIterator(
      SubscriptionType.CALLOUT_POST_CREATED
    );
  }
}
