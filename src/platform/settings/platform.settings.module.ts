import { Module } from '@nestjs/common';
import { PlatformSettingsService } from './platform.settings.service';
import { InnovationHubModule } from '@domain/innovation-hub';
import { VirtualContributorModule } from '@domain/community/virtual-contributor/virtual.contributor.module';
import { AccountModule } from '@domain/space/account/account.module';
import { PlatformSettingsResolverMutations } from './platform.settings.resolver.mutations';
import { PlatformAuthorizationPolicyModule } from '@platform/authorization/platform.authorization.policy.module';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { OrganizationModule } from '@domain/community/organization/organization.module';

@Module({
  imports: [
    InnovationHubModule,
    VirtualContributorModule,
    AccountModule,
    OrganizationModule,
    PlatformAuthorizationPolicyModule,
    AuthorizationModule,
  ],
  providers: [PlatformSettingsService, PlatformSettingsResolverMutations],
  exports: [PlatformSettingsService],
})
export class PlatformSettingsModule {}
