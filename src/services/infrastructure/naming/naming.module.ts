import { Module } from '@nestjs/common';
import { NamingService } from './naming.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CalendarEvent } from '@domain/timeline/event';
import { InnovationHub } from '@domain/innovation-hub/innovation.hub.entity';
import { Discussion } from '@platform/forum-discussion/discussion.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([CalendarEvent]),
    TypeOrmModule.forFeature([Discussion]),
    TypeOrmModule.forFeature([InnovationHub]),
  ],
  providers: [NamingService],
  exports: [NamingService],
})
export class NamingModule {}
