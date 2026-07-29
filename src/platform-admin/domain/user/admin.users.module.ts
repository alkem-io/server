import { AuthorizationModule } from '@core/authorization/authorization.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { UserModule } from '@domain/community/user/user.module';
import { Module } from '@nestjs/common';
import { KratosModule } from '@services/infrastructure/kratos/kratos.module';
import { PlatformUserRecordAuditModule } from '@src/platform-admin/platform-user-record-audit/platform.user.record.audit.module';
import { AdminUsersMutations } from './admin.users.resolver.mutations';

@Module({
  imports: [
    AuthorizationModule,
    // sec-server-4 fix: `AdminUsersMutations` now builds its own
    // resolver-local `accountDeletePolicy` via `AuthorizationPolicyService`
    // rather than checking the shared, widened platform policy.
    AuthorizationPolicyModule,
    KratosModule,
    UserModule,
    PlatformUserRecordAuditModule,
  ],
  providers: [AdminUsersMutations],
  exports: [],
})
export class AdminUsersModule {}
