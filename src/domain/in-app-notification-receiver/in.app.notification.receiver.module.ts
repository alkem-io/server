import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlatformRoleModule } from '@platform/platform.role/platform.role.module';
import { InAppNotificationEntity } from '../in-app-notification/in.app.notification.entity';
import { InAppNotificationReceiver } from './in.app.notification.receiver';
import { InAppNotificationReceiverController } from './in.app.notification.receiver.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([InAppNotificationEntity]),
    PlatformRoleModule,
  ],
  providers: [InAppNotificationReceiver],
  controllers: [InAppNotificationReceiverController],
})
export class InAppNotificationReceiverModule {}
