import { Args, Query, Resolver } from '@nestjs/graphql';
import { CurrentActor, Profiling } from '@common/decorators';
import { AuthorizationPrivilege } from '@common/enums';
import { ActorContext } from '@core/actor-context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { PlatformAuthorizationPolicyService } from '@platform/authorization/platform.authorization.policy.service';
import { ActivityFeedQueryArgs } from './activity.feed.query.args';
import { ActivityFeedService } from './activity.feed.service';
import { ActivityFeed } from './activity.feed.interface';
import { PaginationArgs } from '@core/pagination';
import { IActivityLogEntry } from '@services/api/activity-log/dto/activity.log.entry.interface';
import { ActivityFeedGroupedQueryArgs } from './activity.feed.grouped.query.args';
import { InstrumentResolver } from '@src/apm/decorators';

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
    @CurrentActor() actorContext: ActorContext,
    @Args('args', { nullable: true })
    args?: ActivityFeedQueryArgs
  ): Promise<ActivityFeed> {
    this.authorizationService.grantAccessOrFail(
      actorContext,
      await this.platformAuthorizationService.getPlatformAuthorizationPolicy(),
      AuthorizationPrivilege.READ_USERS,
      `Activity feed query: ${actorContext.actorId}`
    );

    return this.feedService.getActivityFeed(actorContext, {
      ...args,
      pagination,
    });
  }

  @Query(() => [IActivityLogEntry], {
    nullable: false,
    description:
      'Activity events related to the current user grouped by Activity type and resource.',
  })
  @Profiling.api
  public async activityFeedGrouped(
    @CurrentActor() actorContext: ActorContext,
    @Args('args', { nullable: true })
    args?: ActivityFeedGroupedQueryArgs
  ): Promise<IActivityLogEntry[]> {
    this.authorizationService.grantAccessOrFail(
      actorContext,
      await this.platformAuthorizationService.getPlatformAuthorizationPolicy(),
      AuthorizationPrivilege.READ_USERS,
      `Activity feed query: ${actorContext.actorId}`
    );

    return this.feedService.getGroupedActivityFeed(actorContext, args);
  }
}
