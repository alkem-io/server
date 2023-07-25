import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ChatGuidanceAdapter } from './chat.guidance.adapter';

@Module({
  imports: [HttpModule],
  providers: [ChatGuidanceAdapter],
  exports: [ChatGuidanceAdapter],
})
export class ChatGuidanceAdapterModule {}
