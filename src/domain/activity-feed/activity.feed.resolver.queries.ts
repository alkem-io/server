import { Args, Query, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { CurrentUser, Profiling } from '@common/decorators';
import { AuthorizationPrivilege } from '@common/enums';
import { IActivityLogEntry } from '@services/api/activity-log/dto/activity.log.entry.interface';
import { AgentInfo } from '@core/authentication';
import { GraphqlGuard } from '@core/authorization';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { PlatformAuthorizationPolicyService } from '@platform/authorization/platform.authorization.policy.service';
import { ActivityFeedQueryArgs } from './activity.feed.query.args';
import { ActivityFeedService } from '@domain/activity-feed/activity.feed.service';

@Resolver()
export class ActivityFeedResolverQueries {
  constructor(
    private authorizationService: AuthorizationService,
    private platformAuthorizationService: PlatformAuthorizationPolicyService,
    private feedService: ActivityFeedService
  ) {}

  @UseGuards(GraphqlGuard)
  @Query(() => [IActivityLogEntry], {
    nullable: false,
    description: 'Activity events related to the current user.',
  })
  @Profiling.api
  public async activityFeed(
    @CurrentUser() agentInfo: AgentInfo,
    @Args({ nullable: true }) args: ActivityFeedQueryArgs
  ): Promise<IActivityLogEntry[]> {
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      this.platformAuthorizationService.getPlatformAuthorizationPolicy(),
      AuthorizationPrivilege.READ_USERS,
      `Collaboration activity query: ${agentInfo.email}`
    );

    return this.feedService.getActivityFeed(agentInfo.userID, args);
  }
}
