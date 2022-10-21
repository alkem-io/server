import { UseGuards } from '@nestjs/common';
import { Args, Resolver, Query } from '@nestjs/graphql';
import { ActivityLog2Service } from './activity2.log.service';
import { CurrentUser, Profiling } from '@src/common/decorators';
import { ActivityLog2Input } from './dto/activity.log.dto.collaboration.input';
import { GraphqlGuard } from '@core/authorization/graphql.guard';
import { AgentInfo } from '@core/authentication/agent-info';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { CollaborationService } from '@domain/collaboration/collaboration/collaboration.service';
import { IActivityLogEntry } from './dto/activity.log.entry.interface';

@Resolver()
export class ActivityLog2ResolverQueries {
  constructor(
    private activityLogService: ActivityLog2Service,
    private authorizationService: AuthorizationService,
    private collaborationService: CollaborationService
  ) {}

  @UseGuards(GraphqlGuard)
  @Query(() => [IActivityLogEntry], {
    nullable: false,
    description: 'Retrieve the ActivityLog for the specified Collaboration',
  })
  @Profiling.api
  async activityLog2OnCollaboration(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('queryData', { type: () => ActivityLog2Input, nullable: false })
    queryData: ActivityLog2Input
  ): Promise<IActivityLogEntry[]> {
    const collaboration =
      await this.collaborationService.getCollaborationOrFail(
        queryData.collaborationID
      );
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      collaboration.authorization,
      AuthorizationPrivilege.READ,
      `Collaboration activity query: ${agentInfo.email}`
    );
    return await this.activityLogService.activityLog(queryData, agentInfo);
  }
}
