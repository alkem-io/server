import { Module } from '@nestjs/common';
import { PlatformRoleResolverMutations } from './platform.role.resolver.mutations';
import { NotificationAdapterModule } from '@services/adapters/notification-adapter/notification.adapter.module';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { AgentModule } from '@domain/agent/agent/agent.module';
import { AccountModule } from '@domain/space/account/account.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { LicenseModule } from '@domain/common/license/license.module';
import { UserLookupModule } from '@domain/community/user-lookup/user.lookup.module';
import { RoleSetModule } from '@domain/access/role-set/role.set.module';

@Module({
  imports: [
    AccountModule,
    LicenseModule,
    AuthorizationModule,
    AuthorizationPolicyModule,
    NotificationAdapterModule,
    UserLookupModule,
    AgentModule,
    RoleSetModule,
  ],
  providers: [PlatformRoleResolverMutations],
  exports: [],
})
export class PlatformRoleModule {}
