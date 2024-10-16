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
import { PlatformInvitationModule } from '@platform/invitation/platform.invitation.module';
import { InvitationModule } from '@domain/access/invitation/invitation.module';
import { ApplicationModule } from '@domain/access/application/application.module';
import { VirtualContributorModule } from '@domain/community/virtual-contributor/virtual.contributor.module';
import { RoleModule } from '../role/role.module';
import { AgentModule } from '@domain/agent/agent/agent.module';
import { UserModule } from '@domain/community/user/user.module';
import { OrganizationModule } from '@domain/community/organization/organization.module';
import { ContributorModule } from '@domain/community/contributor/contributor.module';
import { EntityResolverModule } from '@services/infrastructure/entity-resolver/entity.resolver.module';
import { RoleSetEventsService } from './role.set.service.events';
import { AiServerAdapterModule } from '@services/adapters/ai-server-adapter/ai.server.adapter.module';
import { NotificationAdapterModule } from '@services/adapters/notification-adapter/notification.adapter.module';
import { RoleSetApplicationLifecycleOptionsProvider } from './role.set.lifecycle.application.options.provider';
import { RoleSetInvitationLifecycleOptionsProvider } from './role.set.lifecycle.invitation.options.provider';
import { ContributionReporterModule } from '@services/external/elasticsearch/contribution-reporter';
import { ActivityAdapterModule } from '@services/adapters/activity-adapter/activity.adapter.module';
import { LifecycleModule } from '@domain/common/lifecycle/lifecycle.module';
import { CommunityCommunicationModule } from '@domain/community/community-communication/community.communication.module';
import { RoleSetResolverFieldsPublic } from './role.set.resolver.fields public';
import { LicenseModule } from '@domain/common/license/license.module';
import { RoleSetLicenseService } from './role.set.service.license';

@Module({
  imports: [
    AuthorizationModule,
    AuthorizationPolicyModule,
    LicenseModule,
    FormModule,
    AgentModule,
    UserModule,
    OrganizationModule,
    ContributorModule,
    RoleModule,
    InvitationModule,
    EntityResolverModule,
    ApplicationModule,
    PlatformInvitationModule,
    VirtualContributorModule,
    AiServerAdapterModule,
    NotificationAdapterModule,
    ContributionReporterModule,
    ActivityAdapterModule,
    LifecycleModule,
    CommunityCommunicationModule,
    TypeOrmModule.forFeature([RoleSet]),
  ],
  providers: [
    RoleSetService,
    RoleSetAuthorizationService,
    RoleSetLicenseService,
    RoleSetResolverMutations,
    RoleSetResolverFields,
    RoleSetResolverFieldsPublic,
    RoleSetEventsService,
    RoleSetApplicationLifecycleOptionsProvider,
    RoleSetInvitationLifecycleOptionsProvider,
  ],
  exports: [RoleSetService, RoleSetAuthorizationService, RoleSetLicenseService],
})
export class RoleSetModule {}
