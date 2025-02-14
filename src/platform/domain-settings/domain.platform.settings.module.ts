import { Module } from '@nestjs/common';
import { DomainPlatformSettingsService } from './domain.platform.settings.service';
import { DomainPlatformSettingsResolverMutations } from './domain.platform.settings.resolver.mutations';
import { PlatformAuthorizationPolicyModule } from '@platform/authorization/platform.authorization.policy.module';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { OrganizationModule } from '@domain/community/organization/organization.module';

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
