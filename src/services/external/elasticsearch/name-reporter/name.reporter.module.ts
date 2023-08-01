import { Module } from '@nestjs/common';
import { NameReporterService } from '@services/external/elasticsearch/name-reporter/name.reporter.service';

@Module({
  providers: [NameReporterService],
  exports: [NameReporterService],
})
export class NameReporterModule {}
