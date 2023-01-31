import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { Communication } from './communication.entity';
import { CommunicationResolverFields } from './communication.resolver.fields';
import { CommunicationResolverMutations } from './communication.resolver.mutations';
import { CommunicationService } from './communication.service';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { CommunicationAuthorizationService } from './communication.service.authorization';
import { DiscussionModule } from '../discussion/discussion.module';
import { CommunicationAdapterModule } from '@services/adapters/communication-adapter/communication-adapter.module';
import { UpdatesModule } from '../updates/updates.module';
import { CommunicationResolverSubscriptions } from './communication.resolver.subscriptions';
import { RoomModule } from '../room/room.module';
import { NotificationAdapterModule } from '@services/adapters/notification-adapter/notification.adapter.module';
import { EntityResolverModule } from '@services/infrastructure/entity-resolver/entity.resolver.module';
import { PlatformAuthorizationPolicyModule } from '@platform/authorization/platform.authorization.policy.module';

@Module({
  imports: [
    AuthorizationModule,
    NotificationAdapterModule,
    AuthorizationPolicyModule,
    DiscussionModule,
    RoomModule,
    CommunicationAdapterModule,
    UpdatesModule,
    CommunicationAdapterModule,
    EntityResolverModule,
    PlatformAuthorizationPolicyModule,
    TypeOrmModule.forFeature([Communication]),
  ],
  providers: [
    CommunicationService,
    CommunicationResolverMutations,
    CommunicationResolverFields,
    CommunicationResolverSubscriptions,
    CommunicationAuthorizationService,
  ],
  exports: [CommunicationService, CommunicationAuthorizationService],
})
export class CommunicationModule {}
