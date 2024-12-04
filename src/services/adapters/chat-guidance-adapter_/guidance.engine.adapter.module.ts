import { Module } from '@nestjs/common';
import { GuidanceEngineAdapter } from './guidance.engine.adapter';
import { GuidanceReporterModule } from '@services/external/elasticsearch/guidance-reporter';

@Module({
  imports: [GuidanceReporterModule],
  providers: [GuidanceEngineAdapter],
  exports: [GuidanceEngineAdapter],
})
export class GuidanceEngineAdapterModule {}
