import { Module } from '@nestjs/common';
import { AiPersonaEngineAdapter } from './ai.persona.engine.adapter';

@Module({
  providers: [AiPersonaEngineAdapter],
  exports: [AiPersonaEngineAdapter],
})
export class AiPersonaEngineAdapterModule {}
