import { Module } from '@nestjs/common';
import { ChatGuidanceAdapter } from './chat.guidance.adapter';

@Module({
  providers: [ChatGuidanceAdapter],
  exports: [ChatGuidanceAdapter],
})
export class ChatGuidanceAdapterModule {}
