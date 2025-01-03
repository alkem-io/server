import { Module } from '@nestjs/common';
import { OrganizationRoleService } from './organization.role.service';
import { OrganizationRoleResolverMutations } from './organization.role.resolver.mutations';
import { OrganizationRoleResolverFields } from './organization.role.resolver.fields';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { AgentModule } from '@domain/agent/agent/agent.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { OrganizationRoleAuthorizationService } from './organization.role.service.authorization';
import { OrganizationLookupModule } from '../organization-lookup/organization.lookup.module';
import { UserLookupModule } from '../user-lookup/user.lookup.module';

@Module({
  imports: [
    AgentModule,
    AuthorizationPolicyModule,
    AuthorizationModule,
    OrganizationLookupModule,
    UserLookupModule,
  ],
  providers: [
    OrganizationRoleService,
    OrganizationRoleResolverMutations,
    OrganizationRoleResolverFields,
    OrganizationRoleAuthorizationService,
  ],
  exports: [OrganizationRoleService],
})
export class OrganizationRoleModule {}
