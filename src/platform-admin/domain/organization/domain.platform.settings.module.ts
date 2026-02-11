import { AuthorizationModule } from '@core/authorization/authorization.module';
import { OrganizationModule } from '@domain/community/organization/organization.module';
import { Module } from '@nestjs/common';
import { PlatformAuthorizationPolicyModule } from '@platform/authorization/platform.authorization.policy.module';
import { DomainPlatformSettingsResolverMutations } from './domain.platform.settings.resolver.mutations';
import { DomainPlatformSettingsService } from './domain.platform.settings.service';

@Module({
  imports: [
    OrganizationModule,
    PlatformAuthorizationPolicyModule,
    AuthorizationModule,
  ],
  providers: [
    DomainPlatformSettingsService,
    DomainPlatformSettingsResolverMutations,
  ],
  exports: [DomainPlatformSettingsService],
})
export class DomainPlatformSettingsModule {}
