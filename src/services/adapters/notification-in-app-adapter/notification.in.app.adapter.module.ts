import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InAppNotificationEntity } from '../../../platform/in-app-notification/in.app.notification.entity';
import { NotificationInAppAdapter } from './notification.in.app.adapter';
import { SubscriptionServiceModule } from '@services/subscriptions/subscription-service';

@Module({
  imports: [
    TypeOrmModule.forFeature([InAppNotificationEntity]),
    SubscriptionServiceModule,
  ],
  exports: [NotificationInAppAdapter],
  providers: [NotificationInAppAdapter],
})
export class NotificationInAppAdapterModule {}
