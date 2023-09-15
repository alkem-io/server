import { Module } from '@nestjs/common';
import { ChatGuidanceLogService } from './chat.guidance.log.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatGuidanceLog } from './chat.guidance.log.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ChatGuidanceLog])],
  providers: [ChatGuidanceLogService],
  exports: [ChatGuidanceLogService],
})
export class ChatGuidanceLogModule {}
