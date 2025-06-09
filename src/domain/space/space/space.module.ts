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
import { AgentModule } from '@domain/agent/agent/agent.module';
import { CollaborationModule } from '@domain/collaboration/collaboration/collaboration.module';
import { ProfileModule } from '@domain/common/profile/profile.module';
import { CommunityModule } from '@domain/community/community/community.module';
import { StorageAggregatorModule } from '@domain/storage/storage-aggregator/storage.aggregator.module';
import { PlatformAuthorizationPolicyModule } from '@platform/authorization/platform.authorization.policy.module';
import { NamingModule } from '@services/infrastructure/naming/naming.module';
import { SpaceSettingsModule } from '../space.settings/space.settings.module';
import { LicensingCredentialBasedModule } from '@platform/licensing/credential-based/licensing-credential-based-entitlements-engine/licensing.credential.based.module';
import { LicenseIssuerModule } from '@platform/licensing/credential-based/license-credential-issuer/license.issuer.module';
import { InputCreatorModule } from '@services/api/input-creator/input.creator.module';
import { RoleSetModule } from '@domain/access/role-set/role.set.module';
import { TemplatesManagerModule } from '@domain/template/templates-manager/templates.manager.module';
import { SpaceDefaultsModule } from '../space.defaults/space.defaults.module';
import { LicensingFrameworkModule } from '@platform/licensing/credential-based/licensing-framework/licensing.framework.module';
import { LicenseModule } from '@domain/common/license/license.module';
import { SpaceLicenseService } from './space.service.license';
import { AccountLookupModule } from '../account.lookup/account.lookup.module';
import { SpaceAboutModule } from '../space.about/space.about.module';
import { SpaceLookupModule } from '../space.lookup/space.lookup.module';

@Module({
  imports: [
    AccountLookupModule,
    AgentModule,
    AuthorizationPolicyModule,
    AuthorizationModule,
    SpaceAboutModule,
    CommunityModule,
    ProfileModule,
    LicensingFrameworkModule,
    LicenseIssuerModule,
    LicensingCredentialBasedModule,
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
    SpaceLookupModule,
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
