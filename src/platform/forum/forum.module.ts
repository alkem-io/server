import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { Forum } from './forum.entity';
import { ForumResolverFields } from './forum.resolver.fields';
import { ForumResolverMutations } from './forum.resolver.mutations';
import { ForumService } from './forum.service';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { ForumAuthorizationService } from './forum.service.authorization';
import { DiscussionModule } from '../forum-discussion/discussion.module';
import { ForumResolverSubscriptions } from './forum.resolver.subscriptions';
import { NotificationAdapterModule } from '@services/adapters/notification-adapter/notification.adapter.module';
import { EntityResolverModule } from '@services/infrastructure/entity-resolver/entity.resolver.module';
import { PlatformAuthorizationPolicyModule } from '@platform/authorization/platform.authorization.policy.module';
import { NamingModule } from '@services/infrastructure/naming/naming.module';
import { StorageAggregatorResolverModule } from '@services/infrastructure/storage-aggregator-resolver/storage.aggregator.resolver.module';
import { CommunicationAdapterModule } from '@services/adapters/communication-adapter/communication-adapter.module';
import { RoomModule } from '@domain/communication/room/room.module';

@Module({
  imports: [
    AuthorizationModule,
    NotificationAdapterModule,
    AuthorizationPolicyModule,
    DiscussionModule,
    EntityResolverModule,
    NamingModule,
    PlatformAuthorizationPolicyModule,
    StorageAggregatorResolverModule,
    CommunicationAdapterModule,
    RoomModule,
    TypeOrmModule.forFeature([Forum]),
  ],
  providers: [
    ForumService,
    ForumResolverMutations,
    ForumResolverFields,
    ForumResolverSubscriptions,
    ForumAuthorizationService,
  ],
  exports: [ForumService, ForumAuthorizationService],
})
export class ForumModule {}
