import { Challenge } from '@domain/challenge/challenge/challenge.entity';
import { Hub } from '@domain/challenge/hub/hub.entity';
import { Collaboration } from '@domain/collaboration/collaboration/collaboration.entity';
import { Opportunity } from '@domain/collaboration/opportunity/opportunity.entity';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActivityModule } from '@src/platform/activity/activity.module';
import { ActivityAdapter } from './activity.adapter';

@Module({
  imports: [
    ActivityModule,
    TypeOrmModule.forFeature([Hub, Challenge, Opportunity, Collaboration]),
  ],
  providers: [ActivityAdapter],
  exports: [ActivityAdapter],
})
export class ActivityAdapterModule {}
