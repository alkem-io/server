import { Module, forwardRef } from '@nestjs/common';
import { RoomControllerService } from './room.controller.service';
import { RoomModule } from '@domain/communication/room/room.module';
import { SubscriptionServiceModule } from '@services/subscriptions/subscription-service';

@Module({
  imports: [forwardRef(() => RoomModule), SubscriptionServiceModule],
  providers: [RoomControllerService],
  exports: [RoomControllerService],
})
export class RoomIntegrationModule {}
