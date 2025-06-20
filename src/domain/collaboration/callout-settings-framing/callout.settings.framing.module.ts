import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProfileModule } from '@domain/common/profile/profile.module';
import { CalloutSettingsFramingService } from './callout.settings.framing.service';
import { CalloutSettingsFraming } from './callout.settings.framing.entity';

@Module({
  imports: [ProfileModule, TypeOrmModule.forFeature([CalloutSettingsFraming])],
  providers: [CalloutSettingsFramingService],
  exports: [CalloutSettingsFramingService],
})
export class CalloutSettingsFramingModule {}
