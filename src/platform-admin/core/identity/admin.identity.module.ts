import { Module } from '@nestjs/common';
import { AdminIdentityService } from './admin.identity.service';
import { AdminIdentityResolverQueries } from './admin.identity.resolver.queries';
import { AdminIdentityResolverMutations } from './admin.identity.resolver.mutations';
import { AdminIdentityResolverFields } from './admin.identity.resolver.fields';
import { KratosModule } from '@services/infrastructure/kratos/kratos.module';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { PlatformAuthorizationPolicyModule } from '@platform/authorization/platform.authorization.policy.module';
import { UserModule } from '@domain/community/user/user.module';
import { UserLookupModule } from '@domain/community/user-lookup/user.lookup.module';

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
