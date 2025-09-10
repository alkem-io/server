import { Module } from '@nestjs/common';
import { AdminIdentityService } from './admin.identity.service';
import { AdminIdentityResolverQueries } from './admin.identity.resolver.queries';
import { AdminIdentityResolverMutations } from './admin.identity.resolver.mutations';
import { AdminIdentityResolverFields } from './admin.identity.resolver.fields';
import { KratosModule } from '@services/infrastructure/kratos/kratos.module';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { PlatformAuthorizationPolicyModule } from '@platform/authorization/platform.authorization.policy.module';

@Module({
  imports: [
    KratosModule,
    AuthorizationModule,
    PlatformAuthorizationPolicyModule,
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
