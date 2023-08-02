import { Module } from '@nestjs/common';
import { GuidanceEngineAdapter } from './guidance.engine.adapter';

@Module({
  providers: [GuidanceEngineAdapter],
  exports: [GuidanceEngineAdapter],
})
export class GuidanceEngineAdapterModule {}
