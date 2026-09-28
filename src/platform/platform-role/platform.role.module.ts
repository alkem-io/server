import { AuthorizationModule } from '@core/authorization/authorization.module';
import { RoleSetModule } from '@domain/access/role-set/role.set.module';
import { ActorModule } from '@domain/actor/actor/actor.module';
import { ActorLookupModule } from '@domain/actor/actor-lookup/actor.lookup.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { LicenseModule } from '@domain/common/license/license.module';
import { OrganizationLookupModule } from '@domain/community/organization-lookup/organization.lookup.module';
import { UserLookupModule } from '@domain/community/user-lookup/user.lookup.module';
import { AccountModule } from '@domain/space/account/account.module';
import { AccountLookupModule } from '@domain/space/account.lookup/account.lookup.module';
import { Module } from '@nestjs/common';
import { PlatformModule } from '@platform/platform/platform.module';
import { NotificationAdapterModule } from '@services/adapters/notification-adapter/notification.adapter.module';
import { PlatformRoleAssignmentAuditModule } from '@src/platform-admin/platform-role-assignment-audit/platform.role.assignment.audit.module';
import { PlatformRoleAssignmentRulesService } from './platform.role.assignment.rules.service';
import { PlatformRoleResolverMutations } from './platform.role.resolver.mutations';

@Module({
  imports: [
    AccountModule,
    AccountLookupModule,
    LicenseModule,
    AuthorizationModule,
    AuthorizationPolicyModule,
    NotificationAdapterModule,
    UserLookupModule,
    OrganizationLookupModule,
    ActorModule,
    ActorLookupModule,
    RoleSetModule,
    PlatformModule,
    PlatformRoleAssignmentAuditModule,
  ],
  providers: [
    PlatformRoleResolverMutations,
    PlatformRoleAssignmentRulesService,
  ],
  // 027-platform-role-redesign (T054): BootstrapService reuses the SAME
  // rule engine for seeded grants — "seeding is not a bypass" only holds if
  // both callers share one instance/one set of rules.
  exports: [PlatformRoleAssignmentRulesService],
})
export class PlatformRoleModule {}
