import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InAppNotificationEntity } from '../in-app-notification/in.app.notification.entity';
import { InAppNotificationReceiver } from './in.app.notification.receiver';
import { InAppNotificationReceiverController } from './in.app.notification.receiver.controller';

@Module({
  imports: [TypeOrmModule.forFeature([InAppNotificationEntity])],
  providers: [InAppNotificationReceiver],
  controllers: [InAppNotificationReceiverController],
})
export class InAppNotificationReceiverModule {}
