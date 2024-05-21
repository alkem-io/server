import { Args, Query, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { CurrentUser, Profiling } from '@common/decorators';
import { AuthorizationPrivilege } from '@common/enums';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { GraphqlGuard } from '@core/authorization';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { PlatformAuthorizationPolicyService } from '@platform/authorization/platform.authorization.policy.service';
import { ActivityFeedQueryArgs } from './activity.feed.query.args';
import { ActivityFeedService } from './activity.feed.service';
import { ActivityFeed } from './activity.feed.interface';
import { PaginationArgs } from '@core/pagination';
import { IActivityLogEntry } from '@services/api/activity-log/dto/activity.log.entry.interface';
import { ActivityFeedGroupedQueryArgs } from './activity.feed.grouped.query.args';

@Resolver()
export class ActivityFeedResolverQueries {
  constructor(
    private authorizationService: AuthorizationService,
    private platformAuthorizationService: PlatformAuthorizationPolicyService,
    private feedService: ActivityFeedService
  ) {}

  @UseGuards(GraphqlGuard)
  @Query(() => ActivityFeed, {
    nullable: false,
    description: 'Activity events related to the current user.',
  })
  @Profiling.api
  public async activityFeed(
    @Args({ nullable: true })
    pagination: PaginationArgs,
    @CurrentUser() agentInfo: AgentInfo,
    @Args('args', { nullable: true })
    args?: ActivityFeedQueryArgs
  ): Promise<ActivityFeed> {
    this.authorizationService.grantAccessOrFail(
      agentInfo,
      await this.platformAuthorizationService.getPlatformAuthorizationPolicy(),
      AuthorizationPrivilege.READ_USERS,
      `Activity feed query: ${agentInfo.email}`
    );

    return this.feedService.getActivityFeed(agentInfo, { ...args, pagination });
  }

  @UseGuards(GraphqlGuard)
  @Query(() => [IActivityLogEntry], {
    nullable: false,
    description:
      'Activity events related to the current user grouped by Activity type and resource.',
  })
  @Profiling.api
  public async activityFeedGrouped(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('args', { nullable: true })
    args?: ActivityFeedGroupedQueryArgs
  ): Promise<IActivityLogEntry[]> {
    this.authorizationService.grantAccessOrFail(
      agentInfo,
      await this.platformAuthorizationService.getPlatformAuthorizationPolicy(),
      AuthorizationPrivilege.READ_USERS,
      `Activity feed query: ${agentInfo.email}`
    );

    return this.feedService.getGroupedActivityFeed(agentInfo, args);
  }
}
