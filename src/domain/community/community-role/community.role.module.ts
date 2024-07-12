import { Module } from '@nestjs/common';
import { CommunityRoleApplicationLifecycleOptionsProvider } from './community.role.lifecycle.application.options.provider';
import { CommunityResolverFields } from './community.role.resolver.fields';
import { CommunityRoleResolverMutations } from './community.role.resolver.mutations';
import { CommunityRoleEventsService } from './community.role.service.events';
import { CommunityModule } from '../community/community.module';
import { CommunityRoleService } from './community.role.service';
import { CommunityRoleInvitationLifecycleOptionsProvider } from './community.role.lifecycle.invitation.options.provider';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { AgentModule } from '@domain/agent/agent/agent.module';
import { UserModule } from '../user/user.module';
import { ContributorModule } from '../contributor/contributor.module';
import { OrganizationModule } from '../organization/organization.module';
import { VirtualContributorModule } from '../virtual-contributor/virtual.contributor.module';
import { ApplicationModule } from '../application/application.module';
import { InvitationModule } from '../invitation/invitation.module';

@Module({
  imports: [
    AuthorizationModule,
    AuthorizationPolicyModule,
    AgentModule,
    CommunityModule,
    UserModule,
    ContributorModule,
    OrganizationModule,
    VirtualContributorModule,
    ApplicationModule,
    InvitationModule,
  ],
  providers: [
    CommunityRoleService,
    CommunityRoleEventsService,
    CommunityRoleResolverMutations,
    CommunityResolverFields,
    CommunityRoleApplicationLifecycleOptionsProvider,
    CommunityRoleInvitationLifecycleOptionsProvider,
  ],
  exports: [CommunityRoleService],
})
export class CommunityRoleModule {}
