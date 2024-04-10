import { Module } from '@nestjs/common';
import { VirtualPersonaEngineAdapter } from './virtual.persona.engine.adapter';

@Module({
  providers: [VirtualPersonaEngineAdapter],
  exports: [VirtualPersonaEngineAdapter],
})
export class VirtualPersonaEngineAdapterModule {}
