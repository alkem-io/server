import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { InAppNotification } from './in.app.notification.entity';
import { InAppNotificationService } from './in.app.notification.service';
import { InAppNotificationResolverMutations } from './in.app.notification.resolver.mutations';
import { InAppNotificationResolverFields } from './in.app.notification.resolver.fields';
import { InAppNotificationPayloadModule } from '@platform/in-app-notification-payload/in.app.notification.payload.module';
import { InAppNotificationResolverSubscription } from './in.app.notification.resolver.subscription';
import { SubscriptionServiceModule } from '@services/subscriptions/subscription-service/subscription.service.module';

@Module({
  imports: [
    AuthorizationModule,
    InAppNotificationPayloadModule,
    SubscriptionServiceModule,
    TypeOrmModule.forFeature([InAppNotification]),
  ],
  providers: [
    InAppNotificationService,
    InAppNotificationResolverFields,
    InAppNotificationResolverMutations,
    InAppNotificationResolverSubscription,
  ],
  exports: [InAppNotificationService],
})
export class InAppNotificationModule {}
