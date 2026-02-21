import { AuthorizationModule } from '@core/authorization/authorization.module';
import { PlatformRolesAccessModule } from '@domain/access/platform-roles-access/platform.roles.access.module';
import { RoleSetModule } from '@domain/access/role-set/role.set.module';
import { AgentModule } from '@domain/agent/agent/agent.module';
import { CollaborationModule } from '@domain/collaboration/collaboration/collaboration.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { InheritedCredentialRuleSetModule } from '@domain/common/inherited-credential-rule-set/inherited.credential.rule.set.module';
import { LicenseModule } from '@domain/common/license/license.module';
import { ProfileModule } from '@domain/common/profile/profile.module';
import { CommunityModule } from '@domain/community/community/community.module';
import { Space } from '@domain/space/space/space.entity';
import { SpaceResolverFields } from '@domain/space/space/space.resolver.fields';
import { SpaceResolverMutations } from '@domain/space/space/space.resolver.mutations';
import { SpaceResolverQueries } from '@domain/space/space/space.resolver.queries';
import { SpaceService } from '@domain/space/space/space.service';
import { SpaceAuthorizationService } from '@domain/space/space/space.service.authorization';
import { StorageAggregatorModule } from '@domain/storage/storage-aggregator/storage.aggregator.module';
import { TemplateContentSpaceModule } from '@domain/template/template-content-space/template.content.space.module';
import { TemplatesManagerModule } from '@domain/template/templates-manager/templates.manager.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlatformAuthorizationPolicyModule } from '@platform/authorization/platform.authorization.policy.module';
import { LicenseIssuerModule } from '@platform/licensing/credential-based/license-credential-issuer/license.issuer.module';
import { LicensingCredentialBasedModule } from '@platform/licensing/credential-based/licensing-credential-based-entitlements-engine/licensing.credential.based.module';
import { LicensingFrameworkModule } from '@platform/licensing/credential-based/licensing-framework/licensing.framework.module';
import { ActivityAdapterModule } from '@services/adapters/activity-adapter/activity.adapter.module';
import { InputCreatorModule } from '@services/api/input-creator/input.creator.module';
import { ContributionReporterModule } from '@services/external/elasticsearch/contribution-reporter';
import { NamingModule } from '@services/infrastructure/naming/naming.module';
import { SpaceFilterModule } from '@services/infrastructure/space-filter/space.filter.module';
import { UrlGeneratorModule } from '@services/infrastructure/url-generator/url.generator.module';
import { AccountLookupModule } from '../account.lookup/account.lookup.module';
import { SpaceAboutModule } from '../space.about/space.about.module';
import { SpaceDefaultsModule } from '../space.defaults/space.defaults.module';
import { SpaceLookupModule } from '../space.lookup/space.lookup.module';
import { SpaceSettingsModule } from '../space.settings/space.settings.module';
import { SpaceResolverSubscriptions } from './space.resolver.subscriptions';
import { SpaceLicenseService } from './space.service.license';
import { SpacePlatformRolesAccessService } from './space.service.platform.roles.access';

@Module({
  imports: [
    AccountLookupModule,
    AgentModule,
    AuthorizationPolicyModule,
    AuthorizationModule,
    InheritedCredentialRuleSetModule,
    SpaceAboutModule,
    CommunityModule,
    ProfileModule,
    LicensingFrameworkModule,
    LicenseIssuerModule,
    LicensingCredentialBasedModule,
    NamingModule,
    PlatformAuthorizationPolicyModule,
    PlatformRolesAccessModule,
    TemplatesManagerModule,
    TemplateContentSpaceModule,
    SpaceSettingsModule,
    StorageAggregatorModule,
    ContributionReporterModule,
    CollaborationModule,
    InputCreatorModule,
    SpaceFilterModule,
    ActivityAdapterModule,
    RoleSetModule,
    SpaceDefaultsModule,
    SpaceLookupModule,
    LicenseModule,
    UrlGeneratorModule,
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
    SpacePlatformRolesAccessService,
  ],
  exports: [SpaceService, SpaceAuthorizationService, SpaceLicenseService],
})
export class SpaceModule {}
