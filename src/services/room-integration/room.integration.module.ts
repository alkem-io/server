import { RoomLookupModule } from '@domain/communication/room-lookup/room.lookup.module';
import { Module } from '@nestjs/common';
import { SubscriptionServiceModule } from '@services/subscriptions/subscription-service';
import { RoomControllerService } from './room.controller.service';

@Module({
  imports: [RoomLookupModule, SubscriptionServiceModule],
  providers: [RoomControllerService],
  exports: [RoomControllerService],
})
export class RoomIntegrationModule {}
