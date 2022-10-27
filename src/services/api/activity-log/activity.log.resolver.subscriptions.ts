import { Args, Resolver } from '@nestjs/graphql';
import { Inject, LoggerService, UseGuards } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { SubscriptionReadService } from '@services/subscriptions/subscription-publish-service';
import { AgentInfo, GraphqlGuard } from '@src/core';
import {
  AuthorizationPrivilege,
  CurrentUser,
  LogContext,
  TypedSubscription,
} from '@src/common';
import { CollaborationService } from '@domain/collaboration/collaboration/collaboration.service';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { ActivityCreatedSubscriptionPayload } from './dto/subscriptions/activity.log.dto.activity.created.subscription.payload';
import { ActivityCreatedSubscriptionArgs } from './dto/subscriptions/activity.log.activity.created.subscription.args';
import { ActivityCreatedSubscriptionResult } from './dto/subscriptions/activity.created.dto';

@Resolver()
export class ActivityLogResolverSubscriptions {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    private readonly subscriptionReadService: SubscriptionReadService,
    private readonly collaborationService: CollaborationService,
    private readonly authorizationService: AuthorizationService
  ) {}

  @UseGuards(GraphqlGuard)
  @TypedSubscription<
    ActivityCreatedSubscriptionPayload,
    ActivityCreatedSubscriptionArgs
  >(() => ActivityCreatedSubscriptionResult, {
    async resolve(
      this: ActivityLogResolverSubscriptions,
      payload,
      args,
      context
    ) {
      const agentInfo = context.req.user;
      const logMsgPrefix = `[New activity subscription] - [${agentInfo.email}] -`;
      this.logger.verbose?.(
        `${logMsgPrefix} sending out event for new activity on Collaboration: ${args.collaborationID} `,
        LogContext.SUBSCRIPTIONS
      );

      return {
        activity: {
          ...payload.activity,
          createdDate: new Date(payload.activity.createdDate),
        },
      };
    },
    filter(
      this: ActivityLogResolverSubscriptions,
      payload,
      variables,
      context
    ) {
      const agentInfo = context.req.user;
      const logMsgPrefix = `[New activity subscription] - [${agentInfo.email}] -`;
      this.logger.verbose?.(
        `${logMsgPrefix} filtering event: ${payload.eventID}`,
        LogContext.SUBSCRIPTIONS
      );

      const isSameCollaboration =
        payload.activity.collaborationID === variables.collaborationID;
      this.logger.verbose?.(
        `${logMsgPrefix} Filter result is ${isSameCollaboration}`,
        LogContext.SUBSCRIPTIONS
      );

      return isSameCollaboration;
    },
  })
  async activityCreated(
    @CurrentUser() agentInfo: AgentInfo,
    @Args({
      nullable: false,
    })
    args: ActivityCreatedSubscriptionArgs
  ) {
    const logMsgPrefix = '[New activity subscription] - ';
    this.logger.verbose?.(
      `${logMsgPrefix} User ${agentInfo.email} subscribed for new activities on Collaboration: ${args.collaborationID}`,
      LogContext.SUBSCRIPTIONS
    );
    // validate args
    const collaboration =
      await this.collaborationService.getCollaborationOrFail(
        args.collaborationID
      );
    // authorize
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      collaboration.authorization,
      AuthorizationPrivilege.READ,
      `subscription to new activities on Collaboration: ${args.collaborationID}`
    );
    // subscribe
    return this.subscriptionReadService.subscribeToActivities();
  }
}
