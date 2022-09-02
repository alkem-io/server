import { UseGuards } from '@nestjs/common';
import { Args, Resolver, Query } from '@nestjs/graphql';
import { ActivityLogService } from './activity.log.service';
import { CurrentUser, Profiling } from '@src/common/decorators';
import { ActivityLogInput } from './dto/activity.log.dto.input';
import { GraphqlGuard } from '@core/authorization/graphql.guard';
import { AgentInfo } from '@core/authentication/agent-info';
import { IActivity } from '@src/platform/activity/activity.interface';

@Resolver()
export class ActivityLogResolverQueries {
  constructor(private activityLogService: ActivityLogService) {}

  @UseGuards(GraphqlGuard)
  @Query(() => [IActivity], {
    nullable: false,
    description: 'Retrieve the ActivityLog using the query parameters supplied',
  })
  @Profiling.api
  async activityLog(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('queryData', { type: () => ActivityLogInput, nullable: true })
    queryData: ActivityLogInput
  ): Promise<IActivity[]> {
    return await this.activityLogService.activityLog(queryData, agentInfo);
  }
}
