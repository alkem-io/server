import { Module } from '@nestjs/common';
import { MessageInboxService } from './message.inbox.service';
import { VirtualContributorLookupModule } from '@domain/community/virtual-contributor-lookup/virtual.contributor.lookup.module';
import { SubscriptionServiceModule } from '@services/subscriptions/subscription-service';
import { CommunicationAdapterModule } from '@services/adapters/communication-adapter/communication-adapter.module';
import { RoomLookupModule } from '@domain/communication/room-lookup/room.lookup.module';
import { RoomMentionsModule } from '@domain/communication/room-mentions/room.mentions.module';
import { VirtualContributorMessageModule } from '@domain/communication/virtual.contributor.message/virtual.contributor.message.module';
import { ActorContextModule } from '@core/actor-context';

@Module({
  imports: [
    RoomLookupModule,
    RoomMentionsModule,
    VirtualContributorLookupModule,
    VirtualContributorMessageModule,
    SubscriptionServiceModule,
    ActorContextModule,
    CommunicationAdapterModule,
  ],
  providers: [MessageInboxService],
  exports: [MessageInboxService],
})
export class MessageInboxModule {}
