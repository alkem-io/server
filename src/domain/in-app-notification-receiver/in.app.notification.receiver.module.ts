import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InAppNotificationEntity } from '../in-app-notification/in.app.notification.entity';
import { InAppNotificationReceiver } from './in.app.notification.receiver';
import { InAppNotificationReceiverController } from './in.app.notification.receiver.controller';
import { PlatformModule } from '@platform/platform/platform.module';
import { RoleSetModule } from '@domain/access/role-set/role.set.module';
import { SubscriptionServiceModule } from '@services/subscriptions/subscription-service';

@Module({
  imports: [
    TypeOrmModule.forFeature([InAppNotificationEntity]),
    PlatformModule,
    RoleSetModule,
    SubscriptionServiceModule,
  ],
  providers: [InAppNotificationReceiver],
  controllers: [InAppNotificationReceiverController],
})
export class InAppNotificationReceiverModule {}
