import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InAppNotificationEntity } from '../../../platform/in-app-notification/in.app.notification.entity';
import { InAppNotificationReceiver } from './in.app.notification.receiver';
import { InAppNotificationReceiverController } from './in.app.notification.receiver.controller';
import { SubscriptionServiceModule } from '@services/subscriptions/subscription-service';

@Module({
  imports: [
    TypeOrmModule.forFeature([InAppNotificationEntity]),
    SubscriptionServiceModule,
  ],
  providers: [InAppNotificationReceiver],
  controllers: [InAppNotificationReceiverController],
})
export class InAppNotificationReceiverModule {}
