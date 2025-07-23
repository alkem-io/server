import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProfileModule } from '@domain/common/profile/profile.module';
import { CalloutContributionDefaultsService } from './callout.contribution.defaults.service';
import { CalloutContributionDefaults } from './callout.contribution.defaults.entity';
import { ProfileDocumentsModule } from '@domain/profile-documents/profile.documents.module';

@Module({
  imports: [
    ProfileModule,
    ProfileDocumentsModule,
    TypeOrmModule.forFeature([CalloutContributionDefaults]),
  ],
  providers: [CalloutContributionDefaultsService],
  exports: [CalloutContributionDefaultsService],
})
export class CalloutContributionDefaultsModule {}
