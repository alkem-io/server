import { AuthorizationModule } from '@core/authorization/authorization.module';
import { UserModule } from '@domain/community/user/user.module';
import { Module } from '@nestjs/common';
import { PlatformAuthorizationPolicyModule } from '@platform/authorization/platform.authorization.policy.module';
import { KratosModule } from '@services/infrastructure/kratos/kratos.module';
import { AdminUsersMutations } from './admin.users.resolver.mutations';
import { AdminAuthenticationIDBackfillModule } from './authentication-id-backfill/authentication-id-backfill.module';

@Module({
  imports: [
    AuthorizationModule,
    PlatformAuthorizationPolicyModule,
    KratosModule,
    UserModule,
    AdminAuthenticationIDBackfillModule,
  ],
  providers: [AdminUsersMutations],
  exports: [],
})
export class AdminUsersModule {}
