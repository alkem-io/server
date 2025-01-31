import { Module } from '@nestjs/common';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { ActivityFeedResolverQueries } from './activity.feed.resolver.queries';
import { ActivityFeedService } from './activity.feed.service';
import { PlatformAuthorizationPolicyModule } from '@platform/authorization/platform.authorization.policy.module';
import { CollaborationModule } from '@domain/collaboration/collaboration/collaboration.module';
import { ActivityModule } from '@platform/activity/activity.module';
import { ActivityLogModule } from '@services/api/activity-log/activity.log.module';
import { SpaceLookupModule } from '@domain/space/space.lookup/space.lookup.module';

@Module({
  imports: [
    AuthorizationModule,
    PlatformAuthorizationPolicyModule,
    CollaborationModule,
    SpaceLookupModule,
    ActivityModule,
    ActivityLogModule,
  ],
  providers: [ActivityFeedResolverQueries, ActivityFeedService],
})
export class ActivityFeedModule {}
