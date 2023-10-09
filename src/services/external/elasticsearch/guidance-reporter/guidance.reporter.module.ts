import { Module } from '@nestjs/common';
import { GuidanceReporterService } from './guidance.reporter.service';
import { ElasticsearchClientProvider } from '../elasticsearch-client';

@Module({
  providers: [GuidanceReporterService, ElasticsearchClientProvider],
  exports: [GuidanceReporterService],
})
export class GuidanceReporterModule {}
