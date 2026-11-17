import { OidcCoreModule } from '@core/auth/oidc/oidc-core.module';
import { SecondFactorModule } from '@core/auth/second-factor/second-factor.module';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { UserLookupModule } from '@domain/community/user-lookup/user.lookup.module';
import { Module } from '@nestjs/common';
import { PlatformAuthorizationPolicyModule } from '@platform/authorization/platform.authorization.policy.module';
import { KratosModule } from '@services/infrastructure/kratos/kratos.module';
import { AdminUserSecondFactorResolverMutations } from './admin.user.second.factor.resolver.mutations';
import { AdminUserSecondFactorService } from './admin.user.second.factor.service';

@Module({
  imports: [
    AuthorizationModule,
    PlatformAuthorizationPolicyModule,
    KratosModule,
    UserLookupModule,
    OidcCoreModule,
    SecondFactorModule,
  ],
  providers: [
    AdminUserSecondFactorService,
    AdminUserSecondFactorResolverMutations,
  ],
})
export class AdminUserSecondFactorModule {}
