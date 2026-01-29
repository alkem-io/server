import { CurrentUser, Profiling } from '@common/decorators';
import { AuthorizationPrivilege } from '@common/enums';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { PaginationArgs } from '@core/pagination';
import { Args, Query, Resolver } from '@nestjs/graphql';
import { PlatformAuthorizationPolicyService } from '@platform/authorization/platform.authorization.policy.service';
import { IActivityLogEntry } from '@services/api/activity-log/dto/activity.log.entry.interface';
import { InstrumentResolver } from '@src/apm/decorators';
import { ActivityFeedGroupedQueryArgs } from './activity.feed.grouped.query.args';
import { ActivityFeed } from './activity.feed.interface';
import { ActivityFeedQueryArgs } from './activity.feed.query.args';
import { ActivityFeedService } from './activity.feed.service';

@InstrumentResolver()
@Resolver()
export class ActivityFeedResolverQueries {
  constructor(
    private authorizationService: AuthorizationService,
    private platformAuthorizationService: PlatformAuthorizationPolicyService,
    private feedService: ActivityFeedService
  ) {}

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
