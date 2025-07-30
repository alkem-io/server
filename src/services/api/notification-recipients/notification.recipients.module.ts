import { Module } from '@nestjs/common';
import { NotificationRecipientsService } from './notification.recipients.service';
import { NotificationRecipientsResolverQueries } from './notification.recipients.resolver.queries';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { PlatformAuthorizationPolicyModule } from '@src/platform/authorization/platform.authorization.policy.module';
import { NotificationRecipientsResolverFields } from './notification.recipients.resolver.fields';

@Module({
  imports: [
    AuthorizationModule,
    AuthorizationPolicyModule,
    PlatformAuthorizationPolicyModule,
  ],
  providers: [
    NotificationRecipientsService,
    NotificationRecipientsResolverQueries,
    NotificationRecipientsResolverFields,
  ],
  exports: [NotificationRecipientsService],
})
export class NotificationRecipientsModule {}
