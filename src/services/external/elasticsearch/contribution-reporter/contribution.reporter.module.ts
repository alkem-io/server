import { Module } from '@nestjs/common';
import { ElasticsearchClientProvider } from '../elasticsearch-client';
import { ContributionReporterService } from './contribution.reporter.service';

@Module({
  providers: [ContributionReporterService, ElasticsearchClientProvider],
  exports: [ContributionReporterService],
})
export class ContributionReporterModule {}
