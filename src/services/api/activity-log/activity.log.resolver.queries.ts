import { Inject, LoggerService } from '@nestjs/common';
import { Args, Resolver, Query } from '@nestjs/graphql';
import { ActivityLogService } from './activity.log.service';
import { CurrentUser, Profiling } from '@src/common/decorators';
import { ActivityLogInput } from './dto/activity.log.dto.collaboration.input';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { CollaborationService } from '@domain/collaboration/collaboration/collaboration.service';
import { IActivityLogEntry } from './dto/activity.log.entry.interface';
import { PlatformAuthorizationPolicyService } from '@platform/authorization/platform.authorization.policy.service';
import { LogContext } from '@common/enums';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { InstrumentResolver } from '@src/apm/decorators';

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
    @CurrentUser() agentInfo: AgentInfo,
    @Args('queryData', { type: () => ActivityLogInput, nullable: false })
    queryData: ActivityLogInput
  ): Promise<IActivityLogEntry[]> {
    // can agent read users
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      await this.platformAuthorizationService.getPlatformAuthorizationPolicy(),
      AuthorizationPrivilege.READ_USERS,
      `Collaboration activity query READ_USERS: ${agentInfo.email}`
    );
    // does collaboration exist
    const collaboration =
      await this.collaborationService.getCollaborationOrFail(
        queryData.collaborationID
      );
    // can agent read the collaboration
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      collaboration.authorization,
      AuthorizationPrivilege.READ,
      `Collaboration activity query: ${agentInfo.email}`
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
              agentInfo,
              childCollaboration.authorization,
              AuthorizationPrivilege.READ,
              `Collaboration activity query: ${agentInfo.email}`
            );
          } catch (e) {
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
        agentInfo.userID
      } + terms: ${JSON.stringify(queryData)}`,
      LogContext.ACTIVITY
    );
    return this.activityLogService.activityLog(queryData);
  }
}
