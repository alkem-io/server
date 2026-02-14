import { AuthorizationModule } from '@core/authorization/authorization.module';
import { Module } from '@nestjs/common';
import { InAppNotificationPayloadModule } from '@platform/in-app-notification-payload/in.app.notification.payload.module';
import { SubscriptionServiceModule } from '@services/subscriptions/subscription-service/subscription.service.module';
import { InAppNotificationResolverFields } from './in.app.notification.resolver.fields';
import { InAppNotificationResolverMutations } from './in.app.notification.resolver.mutations';
import { InAppNotificationResolverSubscription } from './in.app.notification.resolver.subscription';
import { InAppNotificationService } from './in.app.notification.service';

@Module({
  imports: [
    AuthorizationModule,
    InAppNotificationPayloadModule,
    SubscriptionServiceModule,
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
