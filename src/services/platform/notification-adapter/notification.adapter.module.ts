import { Challenge } from '@domain/challenge/challenge/challenge.entity';
import { Hub } from '@domain/challenge/hub/hub.entity';
import { Aspect } from '@domain/collaboration/aspect/aspect.entity';
import { Opportunity } from '@domain/collaboration/opportunity/opportunity.entity';
import { Communication } from '@domain/communication/communication/communication.entity';
import { Discussion } from '@domain/communication/discussion/discussion.entity';
import { Community } from '@domain/community/community/community.entity';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActivityModule } from '@src/platform/activity/activity.module';
import { NotificationAdapter } from './notification.adapter';
import { NotificationPayloadBuilder } from './notification.payload.builder';

@Module({
  imports: [
    ActivityModule,
    TypeOrmModule.forFeature([
      Hub,
      Challenge,
      Opportunity,
      Community,
      Discussion,
      Communication,
      Aspect,
    ]),
  ],
  providers: [NotificationAdapter, NotificationPayloadBuilder],
  exports: [NotificationAdapter],
})
export class NotificationAdapterModule {}
