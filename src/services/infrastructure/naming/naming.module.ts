import { Module } from '@nestjs/common';
import { NamingService } from './naming.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Challenge } from '@domain/challenge/challenge/challenge.entity';
import { Opportunity } from '@domain/challenge/opportunity/opportunity.entity';
import { Project } from '@domain/collaboration/project';
import { Callout } from '@domain/collaboration/callout/callout.entity';
import { Community } from '@domain/community/community/community.entity';
import { Collaboration } from '@domain/collaboration/collaboration/collaboration.entity';
import { CalendarEvent } from '@domain/timeline/event';
import { Discussion } from '@domain/communication/discussion/discussion.entity';
import { InnovationHub } from '@domain/innovation-hub/innovation.hub.entity';
import { CalloutContribution } from '@domain/collaboration/callout-contribution/callout.contribution.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Challenge]),
    TypeOrmModule.forFeature([Opportunity]),
    TypeOrmModule.forFeature([Project]),
    TypeOrmModule.forFeature([Callout]),
    TypeOrmModule.forFeature([Collaboration]),
    TypeOrmModule.forFeature([Community]),
    TypeOrmModule.forFeature([CalendarEvent]),
    TypeOrmModule.forFeature([Discussion]),
    TypeOrmModule.forFeature([InnovationHub]),
    TypeOrmModule.forFeature([CalloutContribution]),
  ],
  providers: [NamingService],
  exports: [NamingService],
})
export class NamingModule {}
