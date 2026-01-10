import { Args, Resolver } from '@nestjs/graphql';
import { Inject, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { SubscriptionReadService } from '@services/subscriptions/subscription-service';
import { ActorContext } from '@core/actor-context';
import { CollaborationService } from '@domain/collaboration/collaboration/collaboration.service';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { ActivityCreatedSubscriptionPayload } from './dto/subscriptions/activity.log.dto.activity.created.subscription.payload';
import { ActivityCreatedSubscriptionInput } from './dto/subscriptions/activity.log.activity.created.subscription.input';
import { ActivityCreatedSubscriptionResult } from './dto/subscriptions/activity.created.dto';
import { TypedSubscription } from '@common/decorators/typed.subscription/typed.subscription.decorator';
import { LogContext } from '@common/enums/logging.context';
import { CurrentActor } from '@common/decorators/current-actor.decorator';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { ActivityLogService } from '@services/api/activity-log/activity.log.service';
import { InstrumentResolver } from '@src/apm/decorators';

@InstrumentResolver()
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
      const actorContext = context.req.user;
      const logMsgPrefix = `[New activity subscription] - [${actorContext.actorId}] -`;
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
      const actorContext = context.req.user;
      const logMsgPrefix = `[New activity subscription] - [${actorContext.actorId}] -`;
      this.logger.verbose?.(
        `${logMsgPrefix} filtering event: ${payload.eventID}`,
        LogContext.SUBSCRIPTIONS
      );

      const collaborationsIds = [collaborationID];

      if (includeChild) {
        // note: may cause performance issues in the future
        // get all child collaborations and authorize them
        const childCollaborations = await this.getAuthorizedChildCollaborations(
          actorContext,
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
    @CurrentActor() actorContext: ActorContext,
    @Args({
      nullable: false,
      name: 'input',
    })
    input: ActivityCreatedSubscriptionInput
  ) {
    const logMsgPrefix = '[New activity subscription] - ';
    this.logger.verbose?.(
      `${logMsgPrefix} User ${actorContext.actorId} subscribed for new activities on Collaboration: ${input.collaborationID}`,
      LogContext.SUBSCRIPTIONS
    );
    // validate args
    const collaboration =
      await this.collaborationService.getCollaborationOrFail(
        input.collaborationID
      );
    // authorize
    this.authorizationService.grantAccessOrFail(
      actorContext,
      collaboration.authorization,
      AuthorizationPrivilege.READ,
      `subscription to new activities on Collaboration: ${input.collaborationID}`
    );
    // subscribe
    return this.subscriptionReadService.subscribeToActivities();
  }

  private async getAuthorizedChildCollaborations(
    actorContext: ActorContext,
    collaborationID: string
  ) {
    const childCollaborations =
      await this.collaborationService.getChildCollaborationsOrFail(
        collaborationID
      );
    // Filter the child collaborations by read access
    const readableChildCollaborations = childCollaborations.filter(
      childCollaboration => {
        try {
          return this.authorizationService.grantAccessOrFail(
            actorContext,
            childCollaboration.authorization,
            AuthorizationPrivilege.READ,
            `Collaboration activity query: ${actorContext.actorId}`
          );
        } catch {
          return false;
        }
      }
    );

    const childCollaborationIds = readableChildCollaborations.map(
      childCollaboration => childCollaboration.id
    );

    return childCollaborationIds;
  }
}
