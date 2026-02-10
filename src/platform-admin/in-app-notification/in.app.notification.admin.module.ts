import { AuthorizationModule } from '@core/authorization/authorization.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlatformAuthorizationPolicyModule } from '@platform/authorization/platform.authorization.policy.module';
import { InAppNotification } from '@platform/in-app-notification/in.app.notification.entity';
import { InAppNotificationAdminResolverMutations } from './in.app.notification.admin.resolver.mutations';
import { InAppNotificationAdminService } from './in.app.notification.admin.service';

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
