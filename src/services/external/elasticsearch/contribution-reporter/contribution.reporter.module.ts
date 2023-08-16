import { Module } from '@nestjs/common';
import { ContributionReporterService } from './contribution.reporter.service';
import { ElasticsearchClientProvider } from '../elasticsearch-client';

@Module({
  providers: [ContributionReporterService, ElasticsearchClientProvider],
  exports: [ContributionReporterService],
})
export class ContributionReporterModule {}
