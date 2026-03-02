import { PushSubscriptionModule } from '@domain/push-subscription/push.subscription.module';
import { Module } from '@nestjs/common';
import { NotificationPushAdapter } from './notification.push.adapter';
import { PushDeliveryService } from './push.delivery.service';
import { PushThrottleService } from './push.throttle.service';

@Module({
  imports: [PushSubscriptionModule],
  providers: [
    NotificationPushAdapter,
    PushDeliveryService,
    PushThrottleService,
  ],
  exports: [NotificationPushAdapter],
})
export class NotificationPushAdapterModule {}
