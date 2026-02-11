import { AuthorizationModule } from '@core/authorization/authorization.module';
import { SpaceLookupModule } from '@domain/space/space.lookup/space.lookup.module';
import { Module } from '@nestjs/common';
import { ActivityModule } from '@platform/activity/activity.module';
import { PlatformAuthorizationPolicyModule } from '@platform/authorization/platform.authorization.policy.module';
import { ActivityLogModule } from '@services/api/activity-log/activity.log.module';
import { ActivityFeedResolverQueries } from './activity.feed.resolver.queries';
import { ActivityFeedService } from './activity.feed.service';

@Module({
  imports: [
    AuthorizationModule,
    PlatformAuthorizationPolicyModule,
    SpaceLookupModule,
    ActivityModule,
    ActivityLogModule,
  ],
  providers: [ActivityFeedResolverQueries, ActivityFeedService],
})
export class ActivityFeedModule {}
