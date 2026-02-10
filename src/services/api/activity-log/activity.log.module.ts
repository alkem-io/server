import { AuthorizationModule } from '@core/authorization/authorization.module';
import { CalloutModule } from '@domain/collaboration/callout/callout.module';
import { CollaborationModule } from '@domain/collaboration/collaboration/collaboration.module';
import { LinkModule } from '@domain/collaboration/link/link.module';
import { PostModule } from '@domain/collaboration/post/post.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { MemoModule } from '@domain/common/memo/memo.module';
import { WhiteboardModule } from '@domain/common/whiteboard/whiteboard.module';
import { RoomModule } from '@domain/communication/room/room.module';
import { CommunityModule } from '@domain/community/community/community.module';
import { UserModule } from '@domain/community/user/user.module';
import { UserLookupModule } from '@domain/community/user-lookup/user.lookup.module';
import { SpaceModule } from '@domain/space/space/space.module';
import { CalendarModule } from '@domain/timeline/calendar/calendar.module';
import { CalendarEventModule } from '@domain/timeline/event/event.module';
import { Module } from '@nestjs/common';
import { PlatformAuthorizationPolicyModule } from '@platform/authorization/platform.authorization.policy.module';
import { ContributorLookupModule } from '@services/infrastructure/contributor-lookup/contributor.lookup.module';
import { EntityResolverModule } from '@services/infrastructure/entity-resolver/entity.resolver.module';
import { UrlGeneratorModule } from '@services/infrastructure/url-generator';
import { SubscriptionServiceModule } from '@services/subscriptions/subscription-service';
import { ActivityModule } from '@src/platform/activity/activity.module';
import { ActivityLogResolverQueries } from './activity.log.resolver.queries';
import { ActivityLogResolverSubscriptions } from './activity.log.resolver.subscriptions';
import { ActivityLogService } from './activity.log.service';

@Module({
  imports: [
    AuthorizationModule,
    AuthorizationPolicyModule,
    ActivityModule,
    CollaborationModule,
    UserModule,
    UserLookupModule,
    ContributorLookupModule,
    CommunityModule,
    CalloutModule,
    PostModule,
    WhiteboardModule,
    MemoModule,
    RoomModule,
    SpaceModule,
    LinkModule,
    CalendarModule,
    CalendarEventModule,
    SubscriptionServiceModule,
    PlatformAuthorizationPolicyModule,
    UrlGeneratorModule,
    EntityResolverModule,
  ],
  providers: [
    ActivityLogService,
    ActivityLogResolverQueries,
    ActivityLogResolverSubscriptions,
  ],
  exports: [ActivityLogService],
})
export class ActivityLogModule {}
