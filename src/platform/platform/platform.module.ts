import { AuthorizationModule } from '@core/authorization/authorization.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { LibraryModule } from '@library/library/library.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlatformAuthorizationPolicyModule } from '@platform/authorization/platform.authorization.policy.module';
import { Platform } from './platform.entity';
import { PlatformResolverFields } from './platform.resolver.fields';
import { PlatformResolverMutations } from './platform.resolver.mutations';
import { PlatformResolverQueries } from './platform.resolver.queries';
import { PlatformService } from './platform.service';
import { PlatformAuthorizationService } from './platform.service.authorization';
import { KonfigModule } from '@platform/configuration/config/config.module';
import { MetadataModule } from '@platform/metadata/metadata.module';
import { StorageAggregatorModule } from '@domain/storage/storage-aggregator/storage.aggregator.module';
import { ForumModule } from '@platform/forum/forum.module';
import { TemplatesManagerModule } from '@domain/template/templates-manager/templates.manager.module';
import { LicensingFrameworkModule } from '@platform/licensing/credential-based/licensing-framework/licensing.framework.module';
import { RoleSetModule } from '@domain/access/role-set/role.set.module';
import { PlatformLicenseService } from './platform.service.license';
import { PlatformSettingsModule } from '@platform/platform-settings/platform.settings.module';
import { LicenseEntitlementModule } from '@domain/common/license-entitlement/license.entitlement.module';
import { PlatformWellKnownVirtualContributorsModule } from '@platform/platform.well.known.virtual.contributors';
import { ConversationsSetModule } from '@domain/communication/conversations-set/conversations.set.module';

@Module({
  imports: [
    AuthorizationModule,
    AuthorizationPolicyModule,
    PlatformAuthorizationPolicyModule,
    PlatformSettingsModule,
    LibraryModule,
    ForumModule,
    ConversationsSetModule,
    StorageAggregatorModule,
    LicenseEntitlementModule,
    KonfigModule,
    MetadataModule,
    LicensingFrameworkModule,
    TemplatesManagerModule,
    RoleSetModule,
    PlatformWellKnownVirtualContributorsModule,
    TypeOrmModule.forFeature([Platform]),
  ],
  providers: [
    PlatformResolverQueries,
    PlatformResolverMutations,
    PlatformResolverFields,
    PlatformService,
    PlatformAuthorizationService,
    PlatformLicenseService,
  ],
  exports: [
    PlatformService,
    PlatformAuthorizationService,
    PlatformLicenseService,
  ],
})
export class PlatformModule {}
