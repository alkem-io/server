import { Module } from '@nestjs/common';
import { AiServerModule } from '@services/ai-server/ai-server/ai.server.module';
import { AiServerAdapter } from './ai.server.adapter';

@Module({
  imports: [AiServerModule],
  providers: [AiServerAdapter],
  exports: [AiServerAdapter],
})
export class AiServerAdapterModule {}
