import { Module } from '@nestjs/common';
import { PlatformRoleResolverFields } from './platform.role.resolver.fields';
import { PlatformRoleResolverMutations } from './platform.role.resolver.mutations';
import { PlatformRoleService } from './platform.role.service';
import { PlatformModule } from '@platform/platform/platform.module';
import { NotificationAdapterModule } from '@services/adapters/notification-adapter/notification.adapter.module';
import { PlatformAuthorizationPolicyModule } from '@platform/authorization/platform.authorization.policy.module';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { AgentModule } from '@domain/agent/agent/agent.module';
import { PlatformInvitationModule } from '@platform/invitation/platform.invitation.module';
import { AccountModule } from '@domain/space/account/account.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { LicenseModule } from '@domain/common/license/license.module';
import { UserLookupModule } from '@domain/community/user-lookup/user.lookup.module';

@Module({
  imports: [
    AccountModule,
    LicenseModule,
    AuthorizationModule,
    AuthorizationPolicyModule,
    PlatformModule,
    PlatformAuthorizationPolicyModule,
    PlatformInvitationModule,
    NotificationAdapterModule,
    UserLookupModule,
    AgentModule,
  ],
  providers: [
    PlatformRoleResolverMutations,
    PlatformRoleResolverFields,
    PlatformRoleService,
  ],
  exports: [PlatformRoleService],
})
export class PlatformRoleModule {}
