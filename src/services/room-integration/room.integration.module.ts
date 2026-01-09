import { Module } from '@nestjs/common';
import { RoomControllerService } from './room.controller.service';
import { SubscriptionServiceModule } from '@services/subscriptions/subscription-service';
import { RoomLookupModule } from '@domain/communication/room-lookup/room.lookup.module';

@Module({
  imports: [RoomLookupModule, SubscriptionServiceModule],
  providers: [RoomControllerService],
  exports: [RoomControllerService],
})
export class RoomIntegrationModule {}
