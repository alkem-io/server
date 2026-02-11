import { InnovationHub } from '@domain/innovation-hub/innovation.hub.entity';
import { CalendarEvent } from '@domain/timeline/event';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Discussion } from '@platform/forum-discussion/discussion.entity';
import { NamingService } from './naming.service';

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
