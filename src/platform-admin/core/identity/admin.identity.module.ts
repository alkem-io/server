import { AuthorizationModule } from '@core/authorization/authorization.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { UserModule } from '@domain/community/user/user.module';
import { UserLookupModule } from '@domain/community/user-lookup/user.lookup.module';
import { Module } from '@nestjs/common';
import { PlatformAuthorizationPolicyModule } from '@platform/authorization/platform.authorization.policy.module';
import { KratosModule } from '@services/infrastructure/kratos/kratos.module';
import { PlatformUserRecordAuditModule } from '@src/platform-admin/platform-user-record-audit/platform.user.record.audit.module';
import { AdminIdentityResolverFields } from './admin.identity.resolver.fields';
import { AdminIdentityResolverMutations } from './admin.identity.resolver.mutations';
import { AdminIdentityResolverQueries } from './admin.identity.resolver.queries';
import { AdminIdentityService } from './admin.identity.service';

@Module({
  imports: [
    KratosModule,
    AuthorizationModule,
    PlatformAuthorizationPolicyModule,
    // sec-server-4 fix: `AdminIdentityResolverMutations` now builds its own
    // resolver-local `identityDeletePolicy` via `AuthorizationPolicyService`
    // rather than checking the shared, widened platform policy.
    AuthorizationPolicyModule,
    UserModule,
    UserLookupModule,
    PlatformUserRecordAuditModule,
  ],
  providers: [
    AdminIdentityService,
    AdminIdentityResolverQueries,
    AdminIdentityResolverMutations,
    AdminIdentityResolverFields,
  ],
  exports: [AdminIdentityService],
})
export class AdminIdentityModule {}
