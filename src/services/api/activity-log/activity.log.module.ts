import { Module } from '@nestjs/common';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { ActivityModule } from '@src/platform/activity/activity.module';
import { CollaborationModule } from '@domain/collaboration/collaboration/collaboration.module';
import { UserModule } from '@domain/community/user/user.module';
import { CommunityModule } from '@domain/community/community/community.module';
import { CalloutModule } from '@domain/collaboration/callout/callout.module';
import { PostModule } from '@domain/collaboration/post/post.module';
import { WhiteboardModule } from '@domain/common/whiteboard/whiteboard.module';
import { ChallengeModule } from '@domain/challenge/challenge/challenge.module';
import { OpportunityModule } from '@domain/collaboration/opportunity/opportunity.module';
import { SubscriptionServiceModule } from '@services/subscriptions/subscription-service';
import { ActivityLogService } from './activity.log.service';
import { ActivityLogResolverQueries } from './activity.log.resolver.queries';
import { ActivityLogResolverSubscriptions } from './activity.log.resolver.subscriptions';
import { PlatformAuthorizationPolicyModule } from '@platform/authorization/platform.authorization.policy.module';
import { RoomModule } from '@domain/communication/room/room.module';

@Module({
  imports: [
    AuthorizationModule,
    AuthorizationPolicyModule,
    ActivityModule,
    CollaborationModule,
    UserModule,
    CommunityModule,
    CalloutModule,
    PostModule,
    WhiteboardModule,
    RoomModule,
    ChallengeModule,
    OpportunityModule,
    SubscriptionServiceModule,
    PlatformAuthorizationPolicyModule,
  ],
  providers: [
    ActivityLogService,
    ActivityLogResolverQueries,
    ActivityLogResolverSubscriptions,
  ],
  exports: [],
})
export class ActivityLogModule {}
