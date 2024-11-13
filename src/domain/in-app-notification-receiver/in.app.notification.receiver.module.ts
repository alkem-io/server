import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InAppNotificationEntity } from '../in-app-notification/in.app.notification.entity';
import { InAppNotificationReceiver } from './in.app.notification.receiver';

@Module({
  imports: [TypeOrmModule.forFeature([InAppNotificationEntity])],
  providers: [InAppNotificationReceiver],
  exports: [InAppNotificationReceiver], //todo what to export
})
export class InAppNotificationReceiverModule {}
