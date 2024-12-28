import { Module } from '@nestjs/common';
import { RoomControllerService } from './room.controller.service';
import { RoomModule } from '@domain/communication/room/room.module';
import { SubscriptionServiceModule } from '@services/subscriptions/subscription-service';
import { VcInteractionModule } from '@domain/communication/vc-interaction/vc.interaction.module';

@Module({
  imports: [RoomModule, VcInteractionModule, SubscriptionServiceModule],
  providers: [RoomControllerService],
  exports: [RoomControllerService],
})
export class RoomIntegrationModule {}
