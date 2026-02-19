import { SUBSCRIPTION_CALLOUT_POST_CREATED } from '@common/constants/providers';
import { CurrentActor } from '@common/decorators/current-actor.decorator';
import { TypedSubscription } from '@common/decorators/typed.subscription/typed.subscription.decorator';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { CalloutContributionType } from '@common/enums/callout.contribution.type';
import { LogContext } from '@common/enums/logging.context';
import { SubscriptionType } from '@common/enums/subscription.type';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { CalloutService } from '@domain/collaboration/callout/callout.service';
import { UUID } from '@domain/common/scalars';
import { Inject, LoggerService } from '@nestjs/common';
import { Args, Resolver } from '@nestjs/graphql';
import { InstrumentResolver } from '@src/apm/decorators';
import { UnableToSubscribeException } from '@src/common/exceptions';
import { PubSubEngine } from 'graphql-subscriptions';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { CalloutPostCreated, CalloutPostCreatedPayload } from './dto';
import { CalloutPostCreatedArgs } from './dto/callout.args.post.created';

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
        const logMsgPrefix = `[User (${actorContext.actorID}) Callout Post Collection] - `;
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
        const logMsgPrefix = `[User (${actorContext.actorID}) Callout Post Collection] - `;
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
    @CurrentActor() actorContext: ActorContext,
    @Args({
      name: 'calloutID',
      type: () => UUID,
      description: 'The ID of the Callout to subscribe to.',
      nullable: false,
    })
    calloutID: string
  ) {
    const logMsgPrefix = `[User (${actorContext.actorID}) Callout Post Collection] - `;
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
