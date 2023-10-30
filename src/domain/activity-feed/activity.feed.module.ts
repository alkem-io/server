import { Module } from '@nestjs/common';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { ActivityFeedResolverQueries } from './activity.feed.resolver.queries';
import { ActivityFeedService } from './activity.feed.service';
import { PlatformAuthorizationPolicyModule } from '@platform/authorization/platform.authorization.policy.module';

@Module({
  imports: [AuthorizationModule, PlatformAuthorizationPolicyModule],
  providers: [ActivityFeedResolverQueries, ActivityFeedService],
})
export class ActivityFeedModule {}
