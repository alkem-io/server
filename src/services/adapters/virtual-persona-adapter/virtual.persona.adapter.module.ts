import { Module } from '@nestjs/common';
import { VirtualPersonaAdapter as VirtualPersonaAdapter } from './virtual.persona.adapter';

@Module({
  providers: [VirtualPersonaAdapter],
  exports: [VirtualPersonaAdapter],
})
export class VirtualPersonaAdapterModule {}
