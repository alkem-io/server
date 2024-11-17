import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Space } from '@domain/space/space/space.entity';
import { SpaceResolverMutations } from '@domain/space/space/space.resolver.mutations';
import { SpaceResolverQueries } from '@domain/space/space/space.resolver.queries';
import { SpaceService } from '@domain/space/space/space.service';
import { SpaceResolverFields } from '@domain/space/space/space.resolver.fields';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { SpaceAuthorizationService } from '@domain/space/space/space.service.authorization';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { SpaceFilterModule } from '@services/infrastructure/space-filter/space.filter.module';
import { SpaceResolverSubscriptions } from './space.resolver.subscriptions';
import { ActivityAdapterModule } from '@services/adapters/activity-adapter/activity.adapter.module';
import { ContributionReporterModule } from '@services/external/elasticsearch/contribution-reporter';
import { NameReporterModule } from '@services/external/elasticsearch/name-reporter/name.reporter.module';
import { ContextModule } from '@domain/context/context/context.module';
import { AgentModule } from '@domain/agent/agent/agent.module';
import { CollaborationModule } from '@domain/collaboration/collaboration/collaboration.module';
import { ProfileModule } from '@domain/common/profile/profile.module';
import { CommunityModule } from '@domain/community/community/community.module';
import { StorageAggregatorModule } from '@domain/storage/storage-aggregator/storage.aggregator.module';
import { PlatformAuthorizationPolicyModule } from '@platform/authorization/platform.authorization.policy.module';
import { NamingModule } from '@services/infrastructure/naming/naming.module';
import { SpaceSettingsModule } from '../space.settings/space.settings.module';
import { AccountHostModule } from '../account.host/account.host.module';
import { LicenseEngineModule } from '@core/license-engine/license.engine.module';
import { LicenseIssuerModule } from '@platform/license-issuer/license.issuer.module';
import { InputCreatorModule } from '@services/api/input-creator/input.creator.module';
import { RoleSetModule } from '@domain/access/role-set/role.set.module';
import { TemplatesManagerModule } from '@domain/template/templates-manager/templates.manager.module';
import { SpaceDefaultsModule } from '../space.defaults/space.defaults.module';
import { LicensingFrameworkModule } from '@platform/licensing-framework/licensing.framework.module';
import { LicenseModule } from '@domain/common/license/license.module';
import { SpaceLicenseService } from './space.service.license';

@Module({
  imports: [
    AccountHostModule,
    AgentModule,
    AuthorizationPolicyModule,
    AuthorizationModule,
    ContextModule,
    CommunityModule,
    ProfileModule,
    LicensingFrameworkModule,
    LicenseIssuerModule,
    LicenseEngineModule,
    NamingModule,
    PlatformAuthorizationPolicyModule,
    TemplatesManagerModule,
    SpaceSettingsModule,
    StorageAggregatorModule,
    ContributionReporterModule,
    CollaborationModule,
    InputCreatorModule,
    SpaceFilterModule,
    ActivityAdapterModule,
    RoleSetModule,
    NameReporterModule,
    SpaceDefaultsModule,
    LicenseModule,
    TypeOrmModule.forFeature([Space]),
  ],
  providers: [
    SpaceService,
    SpaceAuthorizationService,
    SpaceLicenseService,
    SpaceResolverFields,
    SpaceResolverQueries,
    SpaceResolverMutations,
    SpaceResolverSubscriptions,
  ],
  exports: [SpaceService, SpaceAuthorizationService, SpaceLicenseService],
})
export class SpaceModule {}
