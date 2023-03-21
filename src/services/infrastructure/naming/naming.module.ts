import { Module } from '@nestjs/common';
import { NamingService } from './naming.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Challenge } from '@domain/challenge/challenge/challenge.entity';
import { Opportunity } from '@domain/collaboration/opportunity/opportunity.entity';
import { Project } from '@domain/collaboration/project';
import { Aspect } from '@domain/collaboration/aspect/aspect.entity';
import { Hub } from '@domain/challenge/hub/hub.entity';
import { Canvas } from '@domain/common/canvas/canvas.entity';
import { Callout } from '@domain/collaboration/callout/callout.entity';
import { Community } from '@domain/community/community/community.entity';
import { Collaboration } from '@domain/collaboration/collaboration/collaboration.entity';
import { CalendarEvent } from '@domain/timeline/event';

@Module({
  imports: [
    TypeOrmModule.forFeature([Challenge]),
    TypeOrmModule.forFeature([Opportunity]),
    TypeOrmModule.forFeature([Project]),
    TypeOrmModule.forFeature([Aspect]),
    TypeOrmModule.forFeature([Canvas]),
    TypeOrmModule.forFeature([Hub]),
    TypeOrmModule.forFeature([Callout]),
    TypeOrmModule.forFeature([Collaboration]),
    TypeOrmModule.forFeature([Community]),
    TypeOrmModule.forFeature([CalendarEvent]),
  ],
  providers: [NamingService],
  exports: [NamingService],
})
export class NamingModule {}
