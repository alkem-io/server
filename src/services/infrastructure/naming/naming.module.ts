import { Module } from '@nestjs/common';
import { NamingService } from './naming.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Callout } from '@domain/collaboration/callout/callout.entity';
import { Community } from '@domain/community/community/community.entity';
import { Collaboration } from '@domain/collaboration/collaboration/collaboration.entity';
import { CalendarEvent } from '@domain/timeline/event';
import { Discussion } from '@domain/communication/discussion/discussion.entity';
import { InnovationHub } from '@domain/innovation-hub/innovation.hub.entity';
import { CalloutContribution } from '@domain/collaboration/callout-contribution/callout.contribution.entity';
import { Space } from '@domain/challenge/space/space.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Space]),
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
