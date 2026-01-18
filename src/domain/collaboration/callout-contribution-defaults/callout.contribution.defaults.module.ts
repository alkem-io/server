import { ProfileModule } from '@domain/common/profile/profile.module';
import { ProfileDocumentsModule } from '@domain/profile-documents/profile.documents.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CalloutContributionDefaults } from './callout.contribution.defaults.entity';
import { CalloutContributionDefaultsService } from './callout.contribution.defaults.service';

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
