import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { Communication } from './communication.entity';
import { CommunicationResolverFields } from './communication.resolver.fields';
import { CommunicationResolverMutations } from './communication.resolver.mutations';
import { CommunicationService } from './communication.service';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { CommunicationAuthorizationService } from './communication.service.authorization';
import { CommunicationAdapterModule } from '@services/adapters/communication-adapter/communication-adapter.module';
import { RoomModule } from '../room/room.module';
import { NotificationAdapterModule } from '@services/adapters/notification-adapter/notification.adapter.module';
import { StorageAggregatorResolverModule } from '@services/infrastructure/storage-aggregator-resolver/storage.aggregator.resolver.module';
import { PlatformAuthorizationPolicyModule } from '@platform/authorization/platform.authorization.policy.module';
import { UserModule } from '@domain/community/user/user.module';
import { MessagingModule } from '../messaging/messaging.module';
import { ConversationModule } from '../conversation/conversation.module';
import { MessageInboxModule } from '@services/event-handlers/internal/message-inbox/message.inbox.module';

@Module({
  imports: [
    AuthorizationModule,
    NotificationAdapterModule,
    AuthorizationPolicyModule,
    RoomModule,
    CommunicationAdapterModule,
    StorageAggregatorResolverModule,
    PlatformAuthorizationPolicyModule,
    MessagingModule,
    ConversationModule,
    UserModule,
    MessageInboxModule,
    TypeOrmModule.forFeature([Communication]),
  ],
  providers: [
    CommunicationService,
    CommunicationResolverMutations,
    CommunicationResolverFields,
    CommunicationAuthorizationService,
  ],
  exports: [CommunicationService, CommunicationAuthorizationService],
})
export class CommunicationModule {}
