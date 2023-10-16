import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { Callout } from './callout.entity';
import { PostModule } from '../post/post.module';
import { WhiteboardModule } from '@domain/common/whiteboard/whiteboard.module';
import { CalloutResolverMutations } from './callout.resolver.mutations';
import { CalloutService } from './callout.service';
import { CalloutAuthorizationService } from './callout.service.authorization';
import { CalloutResolverFields } from './callout.resolver.fields';
import { CalloutResolverSubscriptions } from './callout.resolver.subscriptions';
import { NamingModule } from '@services/infrastructure/naming/naming.module';
import { ActivityAdapterModule } from '@services/adapters/activity-adapter/activity.adapter.module';
import { NotificationAdapterModule } from '@services/adapters/notification-adapter/notification.adapter.module';
import { EntityResolverModule } from '@services/infrastructure/entity-resolver/entity.resolver.module';
import { CommunityPolicyModule } from '@domain/community/community-policy/community.policy.module';
import { MessagingModule } from '@domain/communication/messaging/messaging.module';
import { ContributionReporterModule } from '@services/external/elasticsearch/contribution-reporter';
import { ProfileModule } from '@domain/common/profile/profile.module';
import { PostTemplateModule } from '@domain/template/post-template/post.template.module';
import { WhiteboardTemplateModule } from '@domain/template/whiteboard-template/whiteboard.template.module';
import { RoomModule } from '@domain/communication/room/room.module';
import { ReferenceModule } from '@domain/common/reference/reference.module';
import { WhiteboardRtModule } from '@domain/common/whiteboard-rt';
import { UserLookupModule } from '@services/infrastructure/user-lookup/user.lookup.module';
import { StorageAggregatorResolverModule } from '@services/infrastructure/storage-aggregator-resolver/storage.aggregator.resolver.module';

@Module({
  imports: [
    EntityResolverModule,
    ContributionReporterModule,
    ActivityAdapterModule,
    NotificationAdapterModule,
    AuthorizationPolicyModule,
    AuthorizationModule,
    PostModule,
    WhiteboardModule,
    WhiteboardRtModule,
    RoomModule,
    CommunityPolicyModule,
    EntityResolverModule,
    UserLookupModule,
    NamingModule,
    ProfileModule,
    PostTemplateModule,
    WhiteboardTemplateModule,
    MessagingModule,
    ReferenceModule,
    StorageAggregatorResolverModule,
    TypeOrmModule.forFeature([Callout]),
  ],
  providers: [
    CalloutResolverMutations,
    CalloutService,
    CalloutAuthorizationService,
    CalloutResolverFields,
    CalloutResolverSubscriptions,
  ],
  exports: [CalloutService, CalloutAuthorizationService],
})
export class CalloutModule {}
