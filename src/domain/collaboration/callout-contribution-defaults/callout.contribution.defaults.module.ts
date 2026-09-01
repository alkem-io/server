import { ProfileModule } from '@domain/common/profile/profile.module';
import { WhiteboardModule } from '@domain/common/whiteboard/whiteboard.module';
import { ProfileDocumentsModule } from '@domain/profile-documents/profile.documents.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CalloutContributionDefaults } from './callout.contribution.defaults.entity';
import { CalloutContributionDefaultsResolverFields } from './callout.contribution.defaults.resolver.fields';
import { CalloutContributionDefaultsService } from './callout.contribution.defaults.service';

@Module({
  imports: [
    ProfileModule,
    ProfileDocumentsModule,
    WhiteboardModule,
    TypeOrmModule.forFeature([CalloutContributionDefaults]),
  ],
  providers: [
    CalloutContributionDefaultsService,
    CalloutContributionDefaultsResolverFields,
  ],
  exports: [CalloutContributionDefaultsService],
})
export class CalloutContributionDefaultsModule {}
