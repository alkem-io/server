import { Module } from '@nestjs/common';
import { PushSubscriptionModule } from '@platform/push-subscription/push.subscription.module';
import { NotificationPushAdapter } from './notification.push.adapter';

@Module({
  imports: [PushSubscriptionModule],
  exports: [NotificationPushAdapter],
  providers: [NotificationPushAdapter],
})
export class NotificationPushAdapterModule {}
