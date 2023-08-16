import { Module } from '@nestjs/common';
import { ElasticsearchClientProvider } from '../elasticsearch-client';
import { NameReporterService } from './name.reporter.service';

@Module({
  providers: [NameReporterService, ElasticsearchClientProvider],
  exports: [NameReporterService],
})
export class NameReporterModule {}
