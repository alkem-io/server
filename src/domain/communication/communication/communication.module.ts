import { AuthorizationModule } from '@core/authorization/authorization.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { InheritedCredentialRuleSetModule } from '@domain/common/inherited-credential-rule-set/inherited.credential.rule.set.module';
import { UserModule } from '@domain/community/user/user.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlatformAuthorizationPolicyModule } from '@platform/authorization/platform.authorization.policy.module';
import { CommunicationAdapterModule } from '@services/adapters/communication-adapter/communication-adapter.module';
import { NotificationAdapterModule } from '@services/adapters/notification-adapter/notification.adapter.module';
import { MessageInboxModule } from '@services/event-handlers/internal/message-inbox/message.inbox.module';
import { StorageAggregatorResolverModule } from '@services/infrastructure/storage-aggregator-resolver/storage.aggregator.resolver.module';
import { ConversationModule } from '../conversation/conversation.module';
import { MessagingModule } from '../messaging/messaging.module';
import { RoomModule } from '../room/room.module';
import { Communication } from './communication.entity';
import { CommunicationResolverFields } from './communication.resolver.fields';
import { CommunicationResolverMutations } from './communication.resolver.mutations';
import { CommunicationService } from './communication.service';
import { CommunicationAuthorizationService } from './communication.service.authorization';

@Module({
  imports: [
    AuthorizationModule,
    NotificationAdapterModule,
    AuthorizationPolicyModule,
    InheritedCredentialRuleSetModule,
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
