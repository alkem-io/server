import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserModule } from '@domain/community/user/user.module';
import { GuidanceReporterModule } from '@services/external/elasticsearch/guidance-reporter';
import { ChatGuidanceLogService } from './chat.guidance.log.service';
import { ChatGuidanceLog } from './chat.guidance.log.entity';

@Module({
  imports: [
    UserModule,
    GuidanceReporterModule,
    TypeOrmModule.forFeature([ChatGuidanceLog]),
  ],
  providers: [ChatGuidanceLogService],
  exports: [ChatGuidanceLogService],
})
export class ChatGuidanceLogModule {}
