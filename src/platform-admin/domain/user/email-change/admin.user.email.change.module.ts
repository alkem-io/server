import { AuthorizationModule } from '@core/authorization/authorization.module';
import { UserEmailChangeModule } from '@domain/community/user-email-change/user.email.change.module';
import { UserLookupModule } from '@domain/community/user-lookup/user.lookup.module';
import { Module } from '@nestjs/common';
import { PlatformAuthorizationPolicyModule } from '@platform/authorization/platform.authorization.policy.module';
import { AdminUserEmailChangeResolverFields } from './admin.user.email.change.resolver.fields';
import { AdminUserEmailChangeResolverMutations } from './admin.user.email.change.resolver.mutations';

@Module({
  imports: [
    AuthorizationModule,
    PlatformAuthorizationPolicyModule,
    UserEmailChangeModule,
    UserLookupModule,
  ],
  providers: [
    AdminUserEmailChangeResolverMutations,
    AdminUserEmailChangeResolverFields,
  ],
  exports: [],
})
export class AdminUserEmailChangeModule {}
