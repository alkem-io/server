import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InAppNotificationReader } from './in.app.notification.reader';
import { InAppNotificationEntity } from '../in-app-notification/in.app.notification.entity';
import { InAppNotificationReceiverController } from '@domain/in-app-notification-receiver/in.app.notification.receiver.controller';
import { InAppNotificationResolverQueries } from '@domain/in-app-notification-reader/in.app.notification.resolver.queries';
import { InAppNotificationBuilder } from '@domain/in-app-notification-reader/in.app.notification.builder';
import { InAppNotificationResolverMutaitons } from './in.app.notification.resolver.mutations';

@Module({
  imports: [TypeOrmModule.forFeature([InAppNotificationEntity])],
  providers: [
    InAppNotificationReader,
    InAppNotificationBuilder,
    InAppNotificationResolverQueries,
    InAppNotificationResolverMutaitons,
  ],
  exports: [InAppNotificationReader],
  controllers: [InAppNotificationReceiverController],
})
export class InAppNotificationReaderModule {}
