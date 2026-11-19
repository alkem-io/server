import { AuthorizationModule } from '@core/authorization/authorization.module';
import { Module } from '@nestjs/common';
import { PlatformAuthorizationPolicyModule } from '@platform/authorization/platform.authorization.policy.module';
import { PlatformSettingsResolverFields } from './platform.settings.resolver.fields';
import { PlatformSettingsService } from './platform.settings.service';

@Module({
  imports: [AuthorizationModule, PlatformAuthorizationPolicyModule],
  providers: [PlatformSettingsService, PlatformSettingsResolverFields],
  exports: [PlatformSettingsService],
})
export class PlatformSettingsModule {}
