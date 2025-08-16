import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { SubscriptionServiceModule } from '@services/subscriptions/subscription-service';
import { InAppNotification } from '../../../platform/in-app-notification/in.app.notification.entity';
import { InAppNotificationResolverQueries } from './in.app.notification.reader.resolver.queries';
import { InAppNotificationResolverSubscription } from './in.app.notification.resolver.subscription';
import { InAppNotificationModule } from '@platform/in-app-notification/in.app.notification.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([InAppNotification]),
    AuthorizationModule,
    SubscriptionServiceModule,
    InAppNotificationModule,
  ],
  providers: [
    InAppNotificationResolverQueries,
    InAppNotificationResolverSubscription,
  ],
  exports: [],
})
export class InAppNotificationReaderModule {}
