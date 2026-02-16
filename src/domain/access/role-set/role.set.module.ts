import { AuthorizationModule } from '@core/authorization/authorization.module';
import { ApplicationModule } from '@domain/access/application/application.module';
import { InvitationModule } from '@domain/access/invitation/invitation.module';
import { PlatformInvitationModule } from '@domain/access/invitation.platform/platform.invitation.module';
import { AgentModule } from '@domain/agent/agent/agent.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { FormModule } from '@domain/common/form/form.module';
import { LicenseModule } from '@domain/common/license/license.module';
import { LifecycleModule } from '@domain/common/lifecycle/lifecycle.module';
import { CommunityCommunicationModule } from '@domain/community/community-communication/community.communication.module';
import { ContributorModule } from '@domain/community/contributor/contributor.module';
import { OrganizationLookupModule } from '@domain/community/organization-lookup/organization.lookup.module';
import { UserModule } from '@domain/community/user/user.module';
import { UserLookupModule } from '@domain/community/user-lookup/user.lookup.module';
import { VirtualContributorLookupModule } from '@domain/community/virtual-contributor-lookup/virtual.contributor.lookup.module';
import { AccountLookupModule } from '@domain/space/account.lookup/account.lookup.module';
import { SpaceLookupModule } from '@domain/space/space.lookup/space.lookup.module';
import { Module } from '@nestjs/common';
import { InAppNotificationModule } from '@platform/in-app-notification/in.app.notification.module';
import { ActivityAdapterModule } from '@services/adapters/activity-adapter/activity.adapter.module';
import { AiServerAdapterModule } from '@services/adapters/ai-server-adapter/ai.server.adapter.module';
import { NotificationAdapterModule } from '@services/adapters/notification-adapter/notification.adapter.module';
import { ContributionReporterModule } from '@services/external/elasticsearch/contribution-reporter';
import { EntityResolverModule } from '@services/infrastructure/entity-resolver/entity.resolver.module';
import { RoleModule } from '../role/role.module';
import { RoleSetMembershipStatusDataLoader } from './role.set.data.loader.membership.status';
import { RoleSetAgentRolesDataLoader } from './role.set.data.loaders.agent.roles';
import { RoleSetResolverFields } from './role.set.resolver.fields';
import { RoleSetResolverFieldsPublic } from './role.set.resolver.fields.public';
import { RoleSetResolverMutations } from './role.set.resolver.mutations';
import { RoleSetResolverMutationsMembership } from './role.set.resolver.mutations.membership';
import { RoleSetService } from './role.set.service';
import { RoleSetAuthorizationService } from './role.set.service.authorization';
import { RoleSetCacheModule } from './role.set.service.cache.module';
import { RoleSetEventsService } from './role.set.service.events';
import { RoleSetLicenseService } from './role.set.service.license';
import { RoleSetServiceLifecycleApplication } from './role.set.service.lifecycle.application';
import { RoleSetServiceLifecycleInvitation } from './role.set.service.lifecycle.invitation';

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
    SpaceLookupModule,
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
    InAppNotificationModule,
    RoleSetCacheModule,
  ],
  providers: [
    RoleSetService,
    RoleSetAuthorizationService,
    RoleSetLicenseService,
    RoleSetResolverMutations,
    RoleSetResolverMutationsMembership,
    RoleSetResolverFields,
    RoleSetResolverFieldsPublic,
    RoleSetEventsService,
    RoleSetServiceLifecycleApplication,
    RoleSetServiceLifecycleInvitation,
    RoleSetAgentRolesDataLoader,
    RoleSetMembershipStatusDataLoader,
  ],
  exports: [
    RoleSetService,
    RoleSetAuthorizationService,
    RoleSetLicenseService,
    RoleSetAgentRolesDataLoader,
    RoleSetMembershipStatusDataLoader,
  ],
})
export class RoleSetModule {}
