import { Module } from '@nestjs/common';
import { GuidanceEngineAdapter } from './guidance.engine.adapter';
import { ChatGuidanceLogModule } from '@services/api/chat-guidance/chat.guidance.log.module';

@Module({
  imports: [ChatGuidanceLogModule],
  providers: [GuidanceEngineAdapter],
  exports: [GuidanceEngineAdapter],
})
export class GuidanceEngineAdapterModule {}
