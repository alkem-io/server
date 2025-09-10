import { Module } from '@nestjs/common';
import { InAppNotificationAdminService } from './in.app.notification.admin.service';
import { InAppNotificationAdminResolverMutations } from './in.app.notification.admin.resolver.mutations';
import { PlatformAuthorizationPolicyModule } from '@platform/authorization/platform.authorization.policy.module';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { InAppNotification } from '@platform/in-app-notification/in.app.notification.entity';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    PlatformAuthorizationPolicyModule,
    AuthorizationModule,
    TypeOrmModule.forFeature([InAppNotification]),
  ],
  providers: [
    InAppNotificationAdminService,
    InAppNotificationAdminResolverMutations,
  ],
  exports: [InAppNotificationAdminService],
})
export class InAppNotificationAdminModule {}
