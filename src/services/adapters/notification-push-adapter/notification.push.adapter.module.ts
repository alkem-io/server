import { DevicePushTokenModule } from '@domain/device-push-token/device.push.token.module';
import { PushSubscriptionModule } from '@domain/push-subscription/push.subscription.module';
import { Module } from '@nestjs/common';
import { MessagingRedisModule } from '@services/infrastructure/redis-client/messaging-redis.module';
import { NativePushSenderService } from './native.push.sender.service';
import { NotificationPushAdapter } from './notification.push.adapter';
import { PushDeliveryService } from './push.delivery.service';
import { PushThrottleService } from './push.throttle.service';

@Module({
  imports: [
    PushSubscriptionModule,
    DevicePushTokenModule,
    MessagingRedisModule,
  ],
  providers: [
    NotificationPushAdapter,
    PushDeliveryService,
    PushThrottleService,
    NativePushSenderService,
  ],
  exports: [NotificationPushAdapter],
})
export class NotificationPushAdapterModule {}
