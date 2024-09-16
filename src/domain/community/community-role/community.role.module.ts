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
import { ApplicationModule } from '../../access/application/application.module';
import { AiServerAdapterModule } from '@services/adapters/ai-server-adapter/ai.server.adapter.module';
import { PlatformInvitationModule } from '@platform/invitation/platform.invitation.module';
import { EntityResolverModule } from '@services/infrastructure/entity-resolver/entity.resolver.module';
import { ContributionReporterModule } from '@services/external/elasticsearch/contribution-reporter';
import { NotificationAdapterModule } from '@services/adapters/notification-adapter/notification.adapter.module';
import { ActivityAdapterModule } from '@services/adapters/activity-adapter/activity.adapter.module';
import { LifecycleModule } from '@domain/common/lifecycle/lifecycle.module';
import { RoleSetModule } from '@domain/access/role-set/role.set.module';
import { RoleModule } from '@domain/access/role/role.module';
import { InvitationModule } from '@domain/access/invitation/invitation.module';

@Module({
  imports: [
    AuthorizationModule,
    AuthorizationPolicyModule,
    EntityResolverModule,
    AgentModule,
    CommunityModule,
    RoleSetModule,
    RoleModule,
    UserModule,
    ContributorModule,
    OrganizationModule,
    VirtualContributorModule,
    LifecycleModule,
    ApplicationModule,
    InvitationModule,
    PlatformInvitationModule,
    AiServerAdapterModule,
    ContributionReporterModule,
    NotificationAdapterModule,
    ActivityAdapterModule,
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
