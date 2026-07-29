import { PushSubscriptionModule } from '@domain/push-subscription/push.subscription.module';
import { Module } from '@nestjs/common';
import { MessagingRedisModule } from '@services/infrastructure/redis-client/messaging-redis.module';
import { MessagingPushBudgetService } from './messaging.push.budget.service';
import { NotificationPushAdapter } from './notification.push.adapter';
import { PushDeliveryService } from './push.delivery.service';
import { PushThrottleService } from './push.throttle.service';

@Module({
  imports: [PushSubscriptionModule, MessagingRedisModule],
  providers: [
    NotificationPushAdapter,
    PushDeliveryService,
    PushThrottleService,
    MessagingPushBudgetService,
  ],
  exports: [NotificationPushAdapter, MessagingPushBudgetService],
})
export class NotificationPushAdapterModule {}
