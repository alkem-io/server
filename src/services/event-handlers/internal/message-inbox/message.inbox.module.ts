import { Module } from '@nestjs/common';
import { MessageInboxService } from './message.inbox.service';
import { MessageNotificationService } from './message.notification.service';
import { VcInvocationService } from './vc.invocation.service';
import { VirtualContributorLookupModule } from '@domain/community/virtual-contributor-lookup/virtual.contributor.lookup.module';
import { SubscriptionServiceModule } from '@services/subscriptions/subscription-service';
import { CommunicationAdapterModule } from '@services/adapters/communication-adapter/communication-adapter.module';
import { RoomLookupModule } from '@domain/communication/room-lookup/room.lookup.module';
import { RoomMentionsModule } from '@domain/communication/room-mentions/room.mentions.module';
import { VirtualContributorMessageModule } from '@domain/communication/virtual.contributor.message/virtual.contributor.message.module';
import { AuthenticationAgentInfoModule } from '@core/authentication.agent.info/agent.info.module';
import { RoomModule } from '@domain/communication/room/room.module';
import { ContributorLookupModule } from '@services/infrastructure/contributor-lookup/contributor.lookup.module';
import { EntityResolverModule } from '@services/infrastructure/entity-resolver/entity.resolver.module';
import { InAppNotificationModule } from '@platform/in-app-notification/in.app.notification.module';

@Module({
  imports: [
    RoomLookupModule,
    RoomMentionsModule,
    RoomModule,
    VirtualContributorLookupModule,
    VirtualContributorMessageModule,
    SubscriptionServiceModule,
    AuthenticationAgentInfoModule,
    CommunicationAdapterModule,
    ContributorLookupModule,
    EntityResolverModule,
    InAppNotificationModule,
  ],
  providers: [
    MessageInboxService,
    MessageNotificationService,
    VcInvocationService,
  ],
  exports: [MessageInboxService],
})
export class MessageInboxModule {}
