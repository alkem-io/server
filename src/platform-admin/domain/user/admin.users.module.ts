import { OidcCoreModule } from '@core/auth/oidc/oidc-core.module';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { UserModule } from '@domain/community/user/user.module';
import { Module } from '@nestjs/common';
import { PlatformAuthorizationPolicyModule } from '@platform/authorization/platform.authorization.policy.module';
import { KratosModule } from '@services/infrastructure/kratos/kratos.module';
import { AdminUsersMutations } from './admin.users.resolver.mutations';

@Module({
  imports: [
    AuthorizationModule,
    PlatformAuthorizationPolicyModule,
    KratosModule,
    UserModule,
    OidcCoreModule,
  ],
  providers: [AdminUsersMutations],
  exports: [],
})
export class AdminUsersModule {}
