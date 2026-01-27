import { AuthorizationModule } from '@core/authorization/authorization.module';
import { UserModule } from '@domain/community/user/user.module';
import { UserLookupModule } from '@domain/community/user-lookup/user.lookup.module';
import { Module } from '@nestjs/common';
import { PlatformAuthorizationPolicyModule } from '@platform/authorization/platform.authorization.policy.module';
import { KratosModule } from '@services/infrastructure/kratos/kratos.module';
import { AdminIdentityResolverFields } from './admin.identity.resolver.fields';
import { AdminIdentityResolverMutations } from './admin.identity.resolver.mutations';
import { AdminIdentityResolverQueries } from './admin.identity.resolver.queries';
import { AdminIdentityService } from './admin.identity.service';

@Module({
  imports: [
    KratosModule,
    AuthorizationModule,
    PlatformAuthorizationPolicyModule,
    UserModule,
    UserLookupModule,
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
