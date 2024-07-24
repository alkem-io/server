import { Module } from '@nestjs/common';
import { OrganizationRoleService } from './organization.role.service';
import { OrganizationRoleResolverMutations } from './organization.role.resolver.mutations';
import { OrganizationRoleResolverFields } from './organization.role.resolver.fields';
import { UserModule } from '@domain/community/user/user.module';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { AgentModule } from '@domain/agent/agent/agent.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { ContributorLookupModule } from '@services/infrastructure/contributor-lookup/contributor.lookup.module';
import { OrganizationRoleAuthorizationService } from './organization.role.service.authorization';

@Module({
  imports: [
    AgentModule,
    AuthorizationPolicyModule,
    AuthorizationModule,
    ContributorLookupModule,
    UserModule,
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
