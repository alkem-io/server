import { ActorContextModule } from '@core/actor-context/actor.context.module';
import { ActorModule } from '@domain/actor/actor/actor.module';
import { ActorLookupModule } from '@domain/actor/actor-lookup/actor.lookup.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { ConversationModule } from '@domain/communication/conversation/conversation.module';
import { RoomModule } from '@domain/communication/room/room.module';
import { RoomLookupModule } from '@domain/communication/room-lookup/room.lookup.module';
import { RoomMentionsModule } from '@domain/communication/room-mentions/room.mentions.module';
import { VirtualContributorMessageModule } from '@domain/communication/virtual.contributor.message/virtual.contributor.message.module';
import { VirtualActorLookupModule } from '@domain/community/virtual-contributor-lookup/virtual.contributor.lookup.module';
import { Module } from '@nestjs/common';
import { InAppNotificationModule } from '@platform/in-app-notification/in.app.notification.module';
import { CommunicationAdapterModule } from '@services/adapters/communication-adapter/communication-adapter.module';
import { EntityResolverModule } from '@services/infrastructure/entity-resolver/entity.resolver.module';
import { SubscriptionServiceModule } from '@services/subscriptions/subscription-service';
import { MessageInboxService } from './message.inbox.service';
import { MessageNotificationService } from './message.notification.service';
import { VcInvocationService } from './vc.invocation.service';

@Module({
  imports: [
    RoomLookupModule,
    RoomMentionsModule,
    RoomModule,
    VirtualActorLookupModule,
    VirtualContributorMessageModule,
    SubscriptionServiceModule,
    ActorContextModule,
    ActorModule,
    AuthorizationPolicyModule,
    CommunicationAdapterModule,
    ActorLookupModule,
    EntityResolverModule,
    InAppNotificationModule,
    ConversationModule,
  ],
  providers: [
    MessageInboxService,
    MessageNotificationService,
    VcInvocationService,
  ],
  exports: [MessageInboxService],
})
export class MessageInboxModule {}
