import { Module } from '@nestjs/common';
import { TrustRegistryAdapterModule } from '@services/external/trust-registry/trust.registry.adapter/trust.registry.adapter.module';
import { AiServerAdapter } from './ai.server.adapter';

@Module({
  imports: [TrustRegistryAdapterModule],
  providers: [AiServerAdapter],
  exports: [AiServerAdapter],
})
export class AiServerAdapterModule {}
