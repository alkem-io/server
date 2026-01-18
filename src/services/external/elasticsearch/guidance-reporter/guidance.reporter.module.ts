import { Module } from '@nestjs/common';
import { ElasticsearchClientProvider } from '../elasticsearch-client';
import { GuidanceReporterService } from './guidance.reporter.service';

@Module({
  imports: [],
  providers: [GuidanceReporterService, ElasticsearchClientProvider],
  exports: [GuidanceReporterService],
})
export class GuidanceReporterModule {}
