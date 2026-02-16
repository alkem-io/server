import { ProfileModule } from '@domain/common/profile/profile.module';
import { ProfileDocumentsModule } from '@domain/profile-documents/profile.documents.module';
import { Module } from '@nestjs/common';
import { CalloutContributionDefaultsService } from './callout.contribution.defaults.service';

@Module({
  imports: [
    ProfileModule,
    ProfileDocumentsModule,
  ],
  providers: [CalloutContributionDefaultsService],
  exports: [CalloutContributionDefaultsService],
})
export class CalloutContributionDefaultsModule {}
