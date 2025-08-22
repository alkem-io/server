import { Module } from '@nestjs/common';
import { NotificationInAppAdapter } from './notification.in.app.adapter';
import { SubscriptionServiceModule } from '@services/subscriptions/subscription-service';
import { InAppNotificationModule } from '@platform/in-app-notification/in.app.notification.module';

@Module({
  imports: [InAppNotificationModule, SubscriptionServiceModule],
  exports: [NotificationInAppAdapter],
  providers: [NotificationInAppAdapter],
})
export class NotificationInAppAdapterModule {}
