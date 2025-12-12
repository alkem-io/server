import { Module } from '@nestjs/common';
import { MessageInboxService } from './message.inbox.service';
import { RoomLookupModule } from '../room-lookup/room.lookup.module';
import { RoomMentionsModule } from '../room-mentions/room.mentions.module';
import { VirtualContributorLookupModule } from '@domain/community/virtual-contributor-lookup/virtual.contributor.lookup.module';
import { VirtualContributorMessageModule } from '../virtual.contributor.message/virtual.contributor.message.module';
import { SubscriptionServiceModule } from '@services/subscriptions/subscription-service';
import { UserLookupModule } from '@domain/community/user-lookup/user.lookup.module';
import { CommunicationAdapterModule } from '@services/adapters/communication-adapter/communication-adapter.module';

@Module({
  imports: [
    RoomLookupModule,
    RoomMentionsModule,
    VirtualContributorLookupModule,
    VirtualContributorMessageModule,
    SubscriptionServiceModule,
    UserLookupModule,
    CommunicationAdapterModule,
  ],
  providers: [MessageInboxService],
  exports: [MessageInboxService],
})
export class MessageInboxModule {}
