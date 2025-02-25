import { AuthorizationModule } from '@core/authorization/authorization.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RoleSet } from './role.set.entity';
import { RoleSetResolverFields } from './role.set.resolver.fields';
import { RoleSetResolverMutations } from './role.set.resolver.mutations';
import { RoleSetService } from './role.set.service';
import { RoleSetAuthorizationService } from './role.set.service.authorization';
import { FormModule } from '@domain/common/form/form.module';
import { PlatformInvitationModule } from '@domain/access/invitation.platform/platform.invitation.module';
import { InvitationModule } from '@domain/access/invitation/invitation.module';
import { ApplicationModule } from '@domain/access/application/application.module';
import { RoleModule } from '../role/role.module';
import { AgentModule } from '@domain/agent/agent/agent.module';
import { ContributorModule } from '@domain/community/contributor/contributor.module';
import { EntityResolverModule } from '@services/infrastructure/entity-resolver/entity.resolver.module';
import { RoleSetEventsService } from './role.set.service.events';
import { AiServerAdapterModule } from '@services/adapters/ai-server-adapter/ai.server.adapter.module';
import { NotificationAdapterModule } from '@services/adapters/notification-adapter/notification.adapter.module';
import { RoleSetServiceLifecycleApplication } from './role.set.service.lifecycle.application';
import { RoleSetServiceLifecycleInvitation } from './role.set.service.lifecycle.invitation';
import { ContributionReporterModule } from '@services/external/elasticsearch/contribution-reporter';
import { ActivityAdapterModule } from '@services/adapters/activity-adapter/activity.adapter.module';
import { LifecycleModule } from '@domain/common/lifecycle/lifecycle.module';
import { CommunityCommunicationModule } from '@domain/community/community-communication/community.communication.module';
import { RoleSetResolverFieldsPublic } from './role.set.resolver.fields.public';
import { LicenseModule } from '@domain/common/license/license.module';
import { RoleSetLicenseService } from './role.set.service.license';
import { VirtualContributorLookupModule } from '@domain/community/virtual-contributor-lookup/virtual.contributor.lookup.module';
import { AccountLookupModule } from '@domain/space/account.lookup/account.lookup.module';
import { UserLookupModule } from '@domain/community/user-lookup/user.lookup.module';
import { OrganizationLookupModule } from '@domain/community/organization-lookup/organization.lookup.module';
import { UserModule } from '@domain/community/user/user.module';
import { RoleSetAgentRolesDataLoader } from './role.set.data.loaders.agent.roles';
import { RoleSetMembershipStatusDataLoader } from './role.set.data.loader.membership.status';
import { RoleSetCacheModule } from './role.set.service.cache.module';

@Module({
  imports: [
    AuthorizationModule,
    AuthorizationPolicyModule,
    LicenseModule,
    FormModule,
    AgentModule,
    UserLookupModule,
    UserModule,
    OrganizationLookupModule,
    VirtualContributorLookupModule,
    ContributorModule,
    RoleModule,
    InvitationModule,
    EntityResolverModule,
    ApplicationModule,
    PlatformInvitationModule,
    AccountLookupModule,
    AiServerAdapterModule,
    NotificationAdapterModule,
    ContributionReporterModule,
    ActivityAdapterModule,
    LifecycleModule,
    CommunityCommunicationModule,
    TypeOrmModule.forFeature([RoleSet]),
    RoleSetCacheModule,
  ],
  providers: [
    RoleSetService,
    RoleSetAuthorizationService,
    RoleSetLicenseService,
    RoleSetResolverMutations,
    RoleSetResolverFields,
    RoleSetResolverFieldsPublic,
    RoleSetEventsService,
    RoleSetServiceLifecycleApplication,
    RoleSetServiceLifecycleInvitation,
    RoleSetAgentRolesDataLoader,
    RoleSetMembershipStatusDataLoader,
  ],
  exports: [RoleSetService, RoleSetAuthorizationService, RoleSetLicenseService],
})
export class RoleSetModule {}
