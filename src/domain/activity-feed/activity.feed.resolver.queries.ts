import { Args, Query, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { CurrentUser, Profiling } from '@common/decorators';
import { AuthorizationPrivilege } from '@common/enums';
import { AgentInfo } from '@core/authentication';
import { GraphqlGuard } from '@core/authorization';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { PlatformAuthorizationPolicyService } from '@platform/authorization/platform.authorization.policy.service';
import { ActivityFeedQueryArgs } from './activity.feed.query.args';
import { ActivityFeedService } from './activity.feed.service';
import { ActivityFeed } from './activity.feed.interface';

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
    @CurrentUser() agentInfo: AgentInfo,
    @Args('args', { nullable: true })
    args?: ActivityFeedQueryArgs
  ): Promise<ActivityFeed> {
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      this.platformAuthorizationService.getPlatformAuthorizationPolicy(),
      AuthorizationPrivilege.READ_USERS,
      `Activity feed query: ${agentInfo.email}`
    );

    return this.feedService.getActivityFeed(agentInfo, args);
  }
}
