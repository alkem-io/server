import { Module } from '@nestjs/common';
import { InAppNotificationModule } from '@platform/in-app-notification/in.app.notification.module';
import { SubscriptionServiceModule } from '@services/subscriptions/subscription-service';
import { NotificationPushAdapterModule } from '@services/adapters/notification-push-adapter/notification.push.adapter.module';
import { NotificationInAppAdapter } from './notification.in.app.adapter';

@Module({
  imports: [
    InAppNotificationModule,
    SubscriptionServiceModule,
    NotificationPushAdapterModule,
  ],
  exports: [NotificationInAppAdapter],
  providers: [NotificationInAppAdapter],
})
export class NotificationInAppAdapterModule {}
