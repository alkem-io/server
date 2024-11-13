import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InAppNotificationReader } from './in.app.notification.reader';
import { InAppNotificationEntity } from './in.app.notification.entity';
import { InAppNotificationReceiverController } from '../in-app-notifications-receiver/in.app.notification.receiver.controller';

@Module({
  imports: [TypeOrmModule.forFeature([InAppNotificationEntity])],
  providers: [InAppNotificationReader],
  exports: [InAppNotificationReader],
  controllers: [InAppNotificationReceiverController],
})
export class InAppNotificationReaderModule {}
