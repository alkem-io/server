import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TemplateContentSpace } from '@domain/templateContentSpace/templateContentSpace/templateContentSpace.entity';
import { TemplateContentSpaceResolverMutations } from '@domain/templateContentSpace/templateContentSpace/templateContentSpace.resolver.mutations';
import { TemplateContentSpaceResolverQueries } from '@domain/templateContentSpace/templateContentSpace/templateContentSpace.resolver.queries';
import { TemplateContentSpaceService } from '@domain/templateContentSpace/templateContentSpace/templateContentSpace.service';
import { TemplateContentSpaceResolverFields } from '@domain/templateContentSpace/templateContentSpace/templateContentSpace.resolver.fields';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { TemplateContentSpaceAuthorizationService } from '@domain/templateContentSpace/templateContentSpace/templateContentSpace.service.authorization';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { TemplateContentSpaceFilterModule } from '@services/infrastructure/templateContentSpace-filter/templateContentSpace.filter.module';
import { TemplateContentSpaceResolverSubscriptions } from './templateContentSpace.resolver.subscriptions';
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
import { TemplateContentSpaceSettingsModule } from '../templateContentSpace.settings/templateContentSpace.settings.module';
import { LicensingCredentialBasedModule } from '@platform/licensing/credential-based/licensing-credential-based-entitlements-engine/licensing.credential.based.module';
import { LicenseIssuerModule } from '@platform/licensing/credential-based/license-credential-issuer/license.issuer.module';
import { InputCreatorModule } from '@services/api/input-creator/input.creator.module';
import { RoleSetModule } from '@domain/access/role-set/role.set.module';
import { TemplatesManagerModule } from '@domain/template/templates-manager/templates.manager.module';
import { TemplateContentSpaceDefaultsModule } from '../templateContentSpace.defaults/templateContentSpace.defaults.module';
import { LicensingFrameworkModule } from '@platform/licensing/credential-based/licensing-framework/licensing.framework.module';
import { LicenseModule } from '@domain/common/license/license.module';
import { TemplateContentSpaceLicenseService } from './templateContentSpace.service.license';
import { AccountLookupModule } from '../account.lookup/account.lookup.module';
import { TemplateContentSpaceAboutModule } from '../templateContentSpace.about/templateContentSpace.about.module';
import { TemplateContentSpaceLookupModule } from '../templateContentSpace.lookup/templateContentSpace.lookup.module';

@Module({
  imports: [
    AccountLookupModule,
    AgentModule,
    AuthorizationPolicyModule,
    AuthorizationModule,
    TemplateContentSpaceAboutModule,
    CommunityModule,
    ProfileModule,
    LicensingFrameworkModule,
    LicenseIssuerModule,
    LicensingCredentialBasedModule,
    NamingModule,
    PlatformAuthorizationPolicyModule,
    TemplatesManagerModule,
    TemplateContentSpaceSettingsModule,
    StorageAggregatorModule,
    ContributionReporterModule,
    CollaborationModule,
    InputCreatorModule,
    TemplateContentSpaceFilterModule,
    ActivityAdapterModule,
    RoleSetModule,
    NameReporterModule,
    TemplateContentSpaceDefaultsModule,
    TemplateContentSpaceLookupModule,
    LicenseModule,
    TypeOrmModule.forFeature([TemplateContentSpace]),
  ],
  providers: [
    TemplateContentSpaceService,
    TemplateContentSpaceAuthorizationService,
    TemplateContentSpaceLicenseService,
    TemplateContentSpaceResolverFields,
    TemplateContentSpaceResolverQueries,
    TemplateContentSpaceResolverMutations,
    TemplateContentSpaceResolverSubscriptions,
  ],
  exports: [
    TemplateContentSpaceService,
    TemplateContentSpaceAuthorizationService,
    TemplateContentSpaceLicenseService,
  ],
})
export class TemplateContentSpaceModule {}
