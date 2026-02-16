import { AuthorizationModule } from '@core/authorization/authorization.module';
import { Module } from '@nestjs/common';
import { PlatformAuthorizationPolicyModule } from '@platform/authorization/platform.authorization.policy.module';
import { InAppNotificationAdminResolverMutations } from './in.app.notification.admin.resolver.mutations';
import { InAppNotificationAdminService } from './in.app.notification.admin.service';

@Module({
  imports: [
    PlatformAuthorizationPolicyModule,
    AuthorizationModule,
  ],
  providers: [
    InAppNotificationAdminService,
    InAppNotificationAdminResolverMutations,
  ],
  exports: [InAppNotificationAdminService],
})
export class InAppNotificationAdminModule {}
