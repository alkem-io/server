import { AuthorizationModule } from '@core/authorization/authorization.module';
import { AgentModule } from '@domain/agent/agent/agent.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { LifecycleModule } from '@domain/common/lifecycle/lifecycle.module';
import { CommunicationModule } from '@domain/communication/communication/communication.module';
import { ApplicationModule } from '@domain/community/application/application.module';
import { UserGroupModule } from '@domain/community/user-group/user-group.module';
import { UserModule } from '@domain/community/user/user.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActivityAdapterModule } from '@services/adapters/activity-adapter/activity.adapter.module';
import { NotificationAdapterModule } from '@services/adapters/notification-adapter/notification.adapter.module';
import { TrustRegistryAdapterModule } from '@services/external/trust-registry/trust.registry.adapter/trust.registry.adapter.module';
import { ContributionReporterModule } from '@services/external/elasticsearch/contribution-reporter';
import { CommunityPolicyModule } from '../community-policy/community.policy.module';
import { OrganizationModule } from '../organization/organization.module';
import { Community } from './community.entity';
import { CommunityApplicationLifecycleOptionsProvider } from './community.lifecycle.application.options.provider';
import { CommunityResolverFields } from './community.resolver.fields';
import { CommunityResolverMutations } from './community.resolver.mutations';
import { CommunityService } from './community.service';
import { CommunityAuthorizationService } from './community.service.authorization';
import { FormModule } from '@domain/common/form/form.module';
import { InvitationModule } from '../invitation/invitation.module';
import { CommunityInvitationLifecycleOptionsProvider } from './community.lifecycle.invitation.options.provider';
import { EntityResolverModule } from '@services/infrastructure/entity-resolver/entity.resolver.module';
import { CommunityEventsService } from './community.service.events';
import { StorageAggregatorResolverModule } from '@services/infrastructure/storage-aggregator-resolver/storage.aggregator.resolver.module';
import { CommunityGuidelinesModule } from '../community-guidelines/community.guidelines.module';
import { VirtualContributorModule } from '../virtual-contributor/virtual.contributor.module';
import { LicenseEngineModule } from '@core/license-engine/license.engine.module';
import { ContributorModule } from '../contributor/contributor.module';
import { PlatformInvitationModule } from '@platform/invitation/platform.invitation.module';
import { AiServerAdapterModule } from '@services/adapters/ai-server-adapter/ai.server.adapter.module';

@Module({
  imports: [
    ActivityAdapterModule,
    NotificationAdapterModule,
    AuthorizationModule,
    AuthorizationPolicyModule,
    AgentModule,
    UserGroupModule,
    UserModule,
    ContributorModule,
    OrganizationModule,
    VirtualContributorModule,
    ApplicationModule,
    InvitationModule,
    PlatformInvitationModule,
    CommunicationModule,
    CommunityPolicyModule,
    CommunityGuidelinesModule,
    LifecycleModule,
    LicenseEngineModule,
    AgentModule,
    EntityResolverModule,
    StorageAggregatorResolverModule,
    FormModule,
    TypeOrmModule.forFeature([Community]),
    TrustRegistryAdapterModule,
    ContributionReporterModule,
    AiServerAdapterModule, // TODO REMOVE
  ],
  providers: [
    CommunityService,
    CommunityAuthorizationService,
    CommunityEventsService,
    CommunityResolverMutations,
    CommunityResolverFields,
    CommunityApplicationLifecycleOptionsProvider,
    CommunityInvitationLifecycleOptionsProvider,
  ],
  exports: [CommunityService, CommunityAuthorizationService],
})
export class CommunityModule {}
