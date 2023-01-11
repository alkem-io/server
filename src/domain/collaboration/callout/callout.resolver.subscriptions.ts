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
import {
  SUBSCRIPTION_CALLOUT_ASPECT_CREATED,
  SUBSCRIPTION_CALLOUT_MESSAGE_CREATED,
} from '@common/constants/providers';
import { CalloutService } from '@domain/collaboration/callout/callout.service';
import { UUID } from '@domain/common/scalars';
import { TypedSubscription } from '@common/decorators/typed.subscription/typed.subscription.decorator';
import { CalloutMessageReceivedArgs } from './dto/callout.args.message.received';
import { CalloutMessageReceived } from './dto/callout.dto.event.message.received';
import { CalloutAspectCreatedArgs } from './dto/callout.args.aspect.created';
import { CalloutAspectCreated, CalloutAspectCreatedPayload } from './dto';
import {
  EntityNotInitializedException,
  UnableToSubscribeException,
  ValidationException,
} from '@src/common/exceptions';
import { CalloutMessageReceivedPayload } from './dto/callout.message.received.payload';
import { CalloutType } from '@common/enums/callout.type';

@Resolver()
export class CalloutResolverSubscriptions {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    @Inject(SUBSCRIPTION_CALLOUT_ASPECT_CREATED)
    private subscriptionAspectCreated: PubSubEngine,
    @Inject(SUBSCRIPTION_CALLOUT_MESSAGE_CREATED)
    private calloutMessageCreatedSubscription: PubSubEngine,
    private calloutService: CalloutService,
    private authorizationService: AuthorizationService
  ) {}

  @UseGuards(GraphqlGuard)
  @TypedSubscription<CalloutAspectCreatedPayload, CalloutAspectCreatedArgs>(
    () => CalloutAspectCreated,
    {
      description:
        'Receive new Update messages on Communities the currently authenticated User is a member of.',
      resolve(this: CalloutResolverSubscriptions, payload, args, context) {
        const agentInfo = context.req.user;
        const logMsgPrefix = `[User (${agentInfo.email}) Callout Aspects] - `;
        this.logger.verbose?.(
          `${logMsgPrefix} sending out event for Aspects on Callout: ${payload.calloutID} `,
          LogContext.SUBSCRIPTIONS
        );

        return {
          ...payload,
          aspect: {
            ...payload.aspect,
            createdDate: new Date(payload.aspect.createdDate),
          },
        };
      },
      filter(this: CalloutResolverSubscriptions, payload, variables, context) {
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
    }
  )
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
    // Validate
    const callout = await this.calloutService.getCalloutOrFail(calloutID);
    if (callout.type !== CalloutType.CARD) {
      throw new UnableToSubscribeException(
        `Unable to subscribe: Callout not of type Card: ${calloutID}`,
        LogContext.SUBSCRIPTIONS
      );
    }
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

  @UseGuards(GraphqlGuard)
  @TypedSubscription<CalloutMessageReceivedPayload, CalloutMessageReceivedArgs>(
    () => CalloutMessageReceived,
    {
      description: 'Receive comments on Callouts',
      resolve(this: CalloutResolverSubscriptions, payload, _, context) {
        const { email } = context.req?.user;
        this.logger.verbose?.(
          `[CalloutMessageReceived] - [${email}] - sending out event for Callout: ${payload.calloutID} `,
          LogContext.SUBSCRIPTIONS
        );
        return payload;
      },
      filter(this: CalloutResolverSubscriptions, payload, variables, context) {
        const { email } = context.req.user;

        const calloutInSubscriptionList = variables.calloutIDs.includes(
          payload.calloutID
        );

        this.logger.verbose?.(
          `[calloutMessageReceived] - [${email}] - [${payload.calloutID}] - [${calloutInSubscriptionList}]`
        );

        return calloutInSubscriptionList;
      },
    }
  )
  async calloutMessageReceived(
    @CurrentUser() agentInfo: AgentInfo,
    @Args({ nullable: false }) args: CalloutMessageReceivedArgs
  ) {
    if (!args.calloutIDs.length) {
      throw new ValidationException(
        'Empty calloutIDs array provided',
        LogContext.SUBSCRIPTIONS
      );
    }

    const validationPromises: Promise<void>[] = [];

    args.calloutIDs.forEach(async id =>
      validationPromises.push(this.validateSubscription(agentInfo, id))
    );

    const settled = await Promise.allSettled(validationPromises);

    const rejected = settled
      .filter(x => x.status === 'rejected')
      .map<PromiseRejectedResult>(x => x as PromiseRejectedResult);

    if (rejected.length) {
      const errors: string[] = [];
      rejected.forEach(x => {
        this.logger.error(
          `Unable to subscribe to messages for Callout with reason: (${x.reason})`,
          LogContext.SUBSCRIPTIONS
        );
        errors.push(x.reason);
      });
      throw new UnableToSubscribeException(
        `Unable to subscribe to calloutIDs list: ${errors}`,
        LogContext.SUBSCRIPTIONS
      );
    }

    this.logger.verbose?.(
      `User (${agentInfo.email}) subscribed to messages for Callouts (${args.calloutIDs})`,
      LogContext.SUBSCRIPTIONS
    );

    return this.calloutMessageCreatedSubscription.asyncIterator(
      SubscriptionType.CALLOUT_MESSAGE_CREATED
    );
  }

  private validateSubscription = async (
    agentInfo: AgentInfo,
    calloutId: string
  ) => {
    const callout = await this.calloutService.getCalloutOrFail(calloutId, {
      relations: ['comments'],
    });

    if (callout.type !== CalloutType.COMMENTS) {
      throw new UnableToSubscribeException(
        `Callout not of type Comments (${calloutId})`,
        LogContext.SUBSCRIPTIONS
      );
    }

    if (!callout.comments) {
      throw new EntityNotInitializedException(
        `Comments not initialized on Callout (${calloutId})`,
        LogContext.SUBSCRIPTIONS
      );
    }

    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      callout.authorization,
      AuthorizationPrivilege.READ,
      `subscription to Comments (${callout.id}) from Callout (${calloutId})`
    );
  };
}
