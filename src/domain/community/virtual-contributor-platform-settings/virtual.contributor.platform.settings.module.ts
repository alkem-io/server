import { Module } from '@nestjs/common';
import { VirtualContributorPlatformSettingsService } from './virtual.contributor.platform.settings.service';

@Module({
  providers: [VirtualContributorPlatformSettingsService],
  exports: [VirtualContributorPlatformSettingsService],
})
export class VirtualContributorPlatformSettingsModule {}
