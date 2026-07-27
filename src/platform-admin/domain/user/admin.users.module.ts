import { AuthorizationModule } from '@core/authorization/authorization.module';
import { UserModule } from '@domain/community/user/user.module';
import { Module } from '@nestjs/common';
import { PlatformAuthorizationPolicyModule } from '@platform/authorization/platform.authorization.policy.module';
import { KratosModule } from '@services/infrastructure/kratos/kratos.module';
import { PlatformUserRecordAuditModule } from '@src/platform-admin/platform-user-record-audit/platform.user.record.audit.module';
import { AdminUsersMutations } from './admin.users.resolver.mutations';

@Module({
  imports: [
    AuthorizationModule,
    PlatformAuthorizationPolicyModule,
    KratosModule,
    UserModule,
    PlatformUserRecordAuditModule,
  ],
  providers: [AdminUsersMutations],
  exports: [],
})
export class AdminUsersModule {}
