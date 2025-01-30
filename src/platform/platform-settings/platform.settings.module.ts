import { Module } from '@nestjs/common';
import { PlatformSettingsService } from './platform.settings.service';

@Module({
  imports: [],
  providers: [PlatformSettingsService],
  exports: [PlatformSettingsService],
})
export class PlatformSettingsModule {}
