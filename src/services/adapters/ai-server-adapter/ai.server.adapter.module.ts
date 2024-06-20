import { Module } from '@nestjs/common';
import { TrustRegistryAdapterModule } from '@services/external/trust-registry/trust.registry.adapter/trust.registry.adapter.module';
import { AiServerAdapter } from './ai.server.adapter';
import { AiServerModule } from '@services/ai-server/ai-server/ai.server.module';
import { AiPersonaServiceModule } from '@services/ai-server/ai-persona-service/ai.persona.service.module';

@Module({
  imports: [AiServerModule, AiPersonaServiceModule],
  providers: [AiServerAdapter],
  exports: [AiServerAdapter],
})
export class AiServerAdapterModule {}
