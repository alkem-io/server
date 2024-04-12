import { Module } from '@nestjs/common';
import { SpaceSettingsService } from './space.settings.service';

@Module({
  imports: [],
  providers: [SpaceSettingsService],
  exports: [SpaceSettingsService],
})
export class SpaceSettingssModule {}
