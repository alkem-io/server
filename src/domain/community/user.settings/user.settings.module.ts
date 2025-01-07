import { Module } from '@nestjs/common';
import { UserSettingsService } from './user.settings.service';

@Module({
  imports: [],
  providers: [UserSettingsService],
  exports: [UserSettingsService],
})
export class UserSettingsModule {}
