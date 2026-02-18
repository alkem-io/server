import { LogContext } from '@common/enums';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { CollaborationService } from '@domain/collaboration/collaboration/collaboration.service';
import { Inject, LoggerService } from '@nestjs/common';
import { Args, Query, Resolver } from '@nestjs/graphql';
import { PlatformAuthorizationPolicyService } from '@platform/authorization/platform.authorization.policy.service';
import { InstrumentResolver } from '@src/apm/decorators';
import { CurrentActor, Profiling } from '@src/common/decorators';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { ActivityLogService } from './activity.log.service';
import { ActivityLogInput } from './dto/activity.log.dto.collaboration.input';
import { IActivityLogEntry } from './dto/activity.log.entry.interface';

@InstrumentResolver()
@Resolver()
export class ActivityLogResolverQueries {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    private activityLogService: ActivityLogService,
    private authorizationService: AuthorizationService,
    private collaborationService: CollaborationService,
    private platformAuthorizationService: PlatformAuthorizationPolicyService
  ) {}

  @Query(() => [IActivityLogEntry], {
    nullable: false,
    description: 'Retrieve the ActivityLog for the specified Collaboration',
  })
  @Profiling.api
  async activityLogOnCollaboration(
    @CurrentActor() actorContext: ActorContext,
    @Args('queryData', { type: () => ActivityLogInput, nullable: false })
    queryData: ActivityLogInput
  ): Promise<IActivityLogEntry[]> {
    // can agent read users
    await this.authorizationService.grantAccessOrFail(
      actorContext,
      await this.platformAuthorizationService.getPlatformAuthorizationPolicy(),
      AuthorizationPrivilege.READ_USERS,
      `Collaboration activity query READ_USERS: ${actorContext.actorId}`
    );
    // does collaboration exist
    const collaboration =
      await this.collaborationService.getCollaborationOrFail(
        queryData.collaborationID
      );
    // can agent read the collaboration
    await this.authorizationService.grantAccessOrFail(
      actorContext,
      collaboration.authorization,
      AuthorizationPrivilege.READ,
      `Collaboration activity query: ${actorContext.actorId}`
    );

    if (queryData.includeChild) {
      // get all child collaborations
      const childCollaborations =
        await this.collaborationService.getChildCollaborationsOrFail(
          queryData.collaborationID
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
      // get activities for all collaborations
      return this.activityLogService.activityLog(
        queryData,
        childCollaborationIds
      );
    }

    this.logger.verbose?.(
      `Querying activityLog by user ${
        actorContext.actorId
      } + terms: ${JSON.stringify(queryData)}`,
      LogContext.ACTIVITY
    );
    return this.activityLogService.activityLog(queryData);
  }
}
