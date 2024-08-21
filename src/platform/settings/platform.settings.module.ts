import { Module } from '@nestjs/common';
import { PlatformSettingsService } from './platform.settings.service';
import { PlatformSettingsResolverMutations } from './platform.settings.resolver.mutations';
import { PlatformAuthorizationPolicyModule } from '@platform/authorization/platform.authorization.policy.module';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { OrganizationModule } from '@domain/community/organization/organization.module';

@Module({
  imports: [
    OrganizationModule,
    PlatformAuthorizationPolicyModule,
    AuthorizationModule,
  ],
  providers: [PlatformSettingsService, PlatformSettingsResolverMutations],
  exports: [PlatformSettingsService],
})
export class PlatformSettingsModule {}
