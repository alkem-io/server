import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InAppNotificationReader } from './in.app.notification.reader';
import { InAppNotificationEntity } from '../in-app-notification/in.app.notification.entity';
import { InAppNotificationReceiverController } from '../in-app-notification-receiver/in.app.notification.receiver.controller';
import { InAppNotificationResolverQueries } from './in.app.notification.resolver.queries';
import { InAppNotificationBuilder } from './in.app.notification.builder';
import { InAppNotificationResolverMutations } from './in.app.notification.resolver.mutations';
import { InAppNotificationResolverFields } from './in.app.notification.resolver.fields';

@Module({
  imports: [TypeOrmModule.forFeature([InAppNotificationEntity])],
  providers: [
    InAppNotificationReader,
    InAppNotificationBuilder,
    InAppNotificationResolverFields,
    InAppNotificationResolverQueries,
    InAppNotificationResolverMutations,
  ],
  exports: [InAppNotificationReader],
  controllers: [InAppNotificationReceiverController],
})
export class InAppNotificationReaderModule {}
