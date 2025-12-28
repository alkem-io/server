import { Module } from '@nestjs/common';
import { ContributionReporterService } from './contribution.reporter.service';
import { ElasticsearchClientProvider } from '../elasticsearch-client';
import { UserLookupModule } from '@domain/community/user-lookup/user.lookup.module';

@Module({
  imports: [UserLookupModule],
  providers: [ContributionReporterService, ElasticsearchClientProvider],
  exports: [ContributionReporterService],
})
export class ContributionReporterModule {}
