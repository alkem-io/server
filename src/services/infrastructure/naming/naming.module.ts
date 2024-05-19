import { Module } from '@nestjs/common';
import { NamingService } from './naming.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Callout } from '@domain/collaboration/callout/callout.entity';
import { CalendarEvent } from '@domain/timeline/event';
import { Discussion } from '@domain/communication/discussion/discussion.entity';
import { InnovationHub } from '@domain/innovation-hub/innovation.hub.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Callout]),
    TypeOrmModule.forFeature([CalendarEvent]),
    TypeOrmModule.forFeature([Discussion]),
    TypeOrmModule.forFeature([InnovationHub]),
  ],
  providers: [NamingService],
  exports: [NamingService],
})
export class NamingModule {}
