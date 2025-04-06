import { Module, forwardRef } from '@nestjs/common';
import { RoomControllerService } from './room.controller.service';
import { SubscriptionServiceModule } from '@services/subscriptions/subscription-service';
import { VcInteractionModule } from '@domain/communication/vc-interaction/vc.interaction.module';
import { RoomLookupModule } from '@domain/communication/room-lookup/room.lookup.module';
import { RoomModule } from '@domain/communication/room/room.module';

@Module({
  imports: [
    RoomLookupModule,
    VcInteractionModule,
    SubscriptionServiceModule,
    forwardRef(() => RoomModule),
  ],
  providers: [RoomControllerService],
  exports: [RoomControllerService],
})
export class RoomIntegrationModule {}
