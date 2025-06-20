import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProfileModule } from '@domain/common/profile/profile.module';
import { CalloutSettingsContributionService } from './callout.settings.contribution.service';
import { CalloutSettingsContribution } from './callout.settings.contribution.entity';

@Module({
  imports: [
    ProfileModule,
    TypeOrmModule.forFeature([CalloutSettingsContribution]),
  ],
  providers: [CalloutSettingsContributionService],
  exports: [CalloutSettingsContributionService],
})
export class CalloutSettingsContributionModule {}
