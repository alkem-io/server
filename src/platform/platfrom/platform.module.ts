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
import { PlatformInvitationModule } from '@platform/invitation/platform.invitation.module';
import { TemplatesManagerModule } from '@domain/template/templates-manager/templates.manager.module';
import { LicensingFrameworkModule } from '@platform/licensing-framework/licensing.framework.module';

@Module({
  imports: [
    AuthorizationModule,
    AuthorizationPolicyModule,
    PlatformAuthorizationPolicyModule,
    LibraryModule,
    ForumModule,
    StorageAggregatorModule,
    KonfigModule,
    MetadataModule,
    LicensingFrameworkModule,
    PlatformInvitationModule,
    TemplatesManagerModule,
    TypeOrmModule.forFeature([Platform]),
  ],
  providers: [
    PlatformResolverQueries,
    PlatformResolverMutations,
    PlatformResolverFields,
    PlatformService,
    PlatformAuthorizationService,
  ],
  exports: [PlatformService, PlatformAuthorizationService],
})
export class PlatformModule {}
