import { Module } from '@nestjs/common';
import { VirtualContributorSettingsService } from './virtual.contributor.settings.service';

@Module({
  imports: [],
  providers: [VirtualContributorSettingsService],
  exports: [VirtualContributorSettingsService],
})
export class VirtualContributorSettingsModule {}
