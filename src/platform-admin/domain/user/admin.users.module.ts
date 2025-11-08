import { Module } from '@nestjs/common';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { PlatformAuthorizationPolicyModule } from '@platform/authorization/platform.authorization.policy.module';
import { KratosModule } from '@services/infrastructure/kratos/kratos.module';
import { UserModule } from '@domain/community/user/user.module';
import { AdminUsersMutations } from './admin.users.resolver.mutations';
import { AdminUsersQueries } from './admin.users.resolver.queries';

@Module({
  imports: [
    AuthorizationModule,
    PlatformAuthorizationPolicyModule,
    KratosModule,
    UserModule,
  ],
  providers: [AdminUsersMutations, AdminUsersQueries],
  exports: [],
})
export class AdminUsersModule {}
