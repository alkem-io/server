import { Args, Resolver } from '@nestjs/graphql';
import { Inject, LoggerService, UseGuards } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { SubscriptionReadService } from '@services/subscriptions/subscription-service';
import { AgentInfo } from '@src/core/authentication/agent-info';
import { CollaborationService } from '@domain/collaboration/collaboration/collaboration.service';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { ActivityCreatedSubscriptionPayload } from './dto/subscriptions/activity.log.dto.activity.created.subscription.payload';
import { ActivityCreatedSubscriptionInput } from './dto/subscriptions/activity.log.activity.created.subscription.input';
import { ActivityCreatedSubscriptionResult } from './dto/subscriptions/activity.created.dto';
import { GraphqlGuard } from '@core/authorization/graphql.guard';
import { TypedSubscription } from '@common/decorators/typed.subscription/typed.subscription.decorator';
import { LogContext } from '@common/enums/logging.context';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { ActivityLogService } from '@services/api/activity-log/activity.log.service';

@Resolver()
export class ActivityLogResolverSubscriptions {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    private readonly subscriptionReadService: SubscriptionReadService,
    private readonly collaborationService: CollaborationService,
    private readonly authorizationService: AuthorizationService,
    private readonly activityLogService: ActivityLogService
  ) {}

  @UseGuards(GraphqlGuard)
  @TypedSubscription<
    ActivityCreatedSubscriptionPayload,
    { input: ActivityCreatedSubscriptionInput }
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
        `${logMsgPrefix} sending out event for new activity on Collaboration: ${args.input.collaborationID} `,
        LogContext.SUBSCRIPTIONS
      );

      const activityLogEntry =
        await this.activityLogService.convertRawActivityToResult({
          ...payload.activity,
          // something is not able to serialize the date
          createdDate: new Date(payload.activity.createdDate),
        });

      if (activityLogEntry) {
        // the activity is a child if the activity collaboration and the requested collaboration (parent) are different
        activityLogEntry.child =
          payload.activity.collaborationID !== args.input.collaborationID;
      }

      return {
        activity: activityLogEntry,
      };
    },
    async filter(
      this: ActivityLogResolverSubscriptions,
      payload,
      variables,
      context
    ) {
      const { types = [], collaborationID, includeChild } = variables.input;
      const agentInfo = context.req.user;
      const logMsgPrefix = `[New activity subscription] - [${agentInfo.email}] -`;
      this.logger.verbose?.(
        `${logMsgPrefix} filtering event: ${payload.eventID}`,
        LogContext.SUBSCRIPTIONS
      );

      const collaborationsIds = [collaborationID];

      if (includeChild) {
        // note: may cause performance issues in the future
        // get all child collaborations and authorize them
        const childCollaborations = await this.getAuthorizedChildCollaborations(
          agentInfo,
          collaborationID
        );
        collaborationsIds.push(...childCollaborations);
      }

      const activityInSubscribedCollaboration = collaborationsIds.includes(
        payload.activity.collaborationID
      );
      // if types is empty, return all types
      const activityOfSubscribedType = types.length
        ? Boolean(types.includes(payload.activity.type))
        : true;

      const isSameCollaboration =
        activityInSubscribedCollaboration && activityOfSubscribedType;
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
      name: 'input',
    })
    input: ActivityCreatedSubscriptionInput
  ) {
    const logMsgPrefix = '[New activity subscription] - ';
    this.logger.verbose?.(
      `${logMsgPrefix} User ${agentInfo.email} subscribed for new activities on Collaboration: ${input.collaborationID}`,
      LogContext.SUBSCRIPTIONS
    );
    // validate args
    const collaboration =
      await this.collaborationService.getCollaborationOrFail(
        input.collaborationID
      );
    // authorize
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      collaboration.authorization,
      AuthorizationPrivilege.READ,
      `subscription to new activities on Collaboration: ${input.collaborationID}`
    );
    // subscribe
    return this.subscriptionReadService.subscribeToActivities();
  }

  private async getAuthorizedChildCollaborations(
    agentInfo: AgentInfo,
    collaborationID: string
  ) {
    const childCollaborations =
      await this.collaborationService.getChildCollaborationsOrFail(
        collaborationID
      );
    const childCollaborationIds: string[] = [];
    // can agent read each collaboration
    for (const childCollaboration of childCollaborations) {
      try {
        await this.authorizationService.grantAccessOrFail(
          agentInfo,
          childCollaboration.authorization,
          AuthorizationPrivilege.READ,
          `Collaboration activity query: ${agentInfo.email}`
        );
        childCollaborationIds.push(childCollaboration.id);
      } catch (e) {
        this.logger?.warn(
          `User ${agentInfo.userID} is not able to read child collaboration ${childCollaboration.id}`,
          LogContext.COLLABORATION
        );
      }
    }

    return childCollaborationIds;
  }
}
