import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProfileModule } from '@domain/common/profile/profile.module';
import { CalloutContributionDefaultsService } from './callout.contribution.defaults.service';
import { CalloutContributionDefaults } from './callout.contribution.defaults.entity';

@Module({
  imports: [
    ProfileModule,
    TypeOrmModule.forFeature([CalloutContributionDefaults]),
  ],
  providers: [CalloutContributionDefaultsService],
  exports: [CalloutContributionDefaultsService],
})
export class CalloutContributionDefaultsModule {}
