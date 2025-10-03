import { Module } from '@nestjs/common';
import { AiServerAdapter } from './ai.server.adapter';
import { AiServerModule } from '@services/ai-server/ai-server/ai.server.module';

@Module({
  imports: [AiServerModule],
  providers: [AiServerAdapter],
  exports: [AiServerAdapter],
})
export class AiServerAdapterModule {}
