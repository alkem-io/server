import { AuthorizationModule } from '@core/authorization/authorization.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NamingModule } from '@services/infrastructure/naming/naming.module';
import { ActivityAdapterModule } from '@services/adapters/activity-adapter/activity.adapter.module';
import { CommunicationAdapterModule } from '@services/adapters/communication-adapter/communication-adapter.module';
import { NotificationAdapterModule } from '@services/adapters/notification-adapter/notification.adapter.module';
import { ElasticsearchModule } from '@services/external/elasticsearch';
import { EntityResolverModule } from '@services/infrastructure/entity-resolver/entity.resolver.module';
import { RoomResolverFields } from './room.resolver.fields';
import { RoomResolverMutations } from './room.resolver.mutations';
import { RoomService } from './room.service';
import { RoomAuthorizationService } from './room.service.authorization';
import { MessagingModule } from '../messaging/messaging.module';
import { Room } from './room.entity';
import { RoomResolverSubscriptions } from './room.resolver.subscriptions';

@Module({
  imports: [
    EntityResolverModule,
    ElasticsearchModule,
    ActivityAdapterModule,
    NotificationAdapterModule,
    AuthorizationModule,
    AuthorizationPolicyModule,
    NamingModule,
    RoomModule,
    CommunicationAdapterModule,
    MessagingModule,
    TypeOrmModule.forFeature([Room]),
  ],
  providers: [
    RoomService,
    RoomAuthorizationService,
    RoomResolverFields,
    RoomResolverMutations,
    RoomResolverSubscriptions,
  ],
  exports: [RoomService, RoomAuthorizationService],
})
export class RoomModule {}
