import { Module } from '@nestjs/common';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { ActivityModule } from '@src/platform/activity/activity.module';
import { CollaborationModule } from '@domain/collaboration/collaboration/collaboration.module';
import { UserModule } from '@domain/community/user/user.module';
import { CommunityModule } from '@domain/community/community/community.module';
import { CalloutModule } from '@domain/collaboration/callout/callout.module';
import { AspectModule } from '@domain/collaboration/aspect/aspect.module';
import { CanvasModule } from '@domain/common/canvas/canvas.module';
import { ChallengeModule } from '@domain/challenge/challenge/challenge.module';
import { OpportunityModule } from '@domain/collaboration/opportunity/opportunity.module';
import { SubscriptionPublishServiceModule } from '@services/subscriptions/subscription-publish-service';
import { ActivityLogService } from './activity.log.service';
import { ActivityLogResolverQueries } from './activity.log.resolver.queries';
import { ActivityLogResolverSubscriptions } from './activity.log.resolver.subscriptions';

@Module({
  imports: [
    AuthorizationModule,
    AuthorizationPolicyModule,
    ActivityModule,
    CollaborationModule,
    UserModule,
    CommunityModule,
    CalloutModule,
    AspectModule,
    CanvasModule,
    ChallengeModule,
    OpportunityModule,
    SubscriptionPublishServiceModule,
  ],
  providers: [
    ActivityLogService,
    ActivityLogResolverQueries,
    ActivityLogResolverSubscriptions,
  ],
  exports: [],
})
export class ActivityLogModule {}
