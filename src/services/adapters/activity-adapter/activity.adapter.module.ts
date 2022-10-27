import { Callout } from '@domain/collaboration/callout/callout.entity';
import { Collaboration } from '@domain/collaboration/collaboration/collaboration.entity';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActivityModule } from '@src/platform/activity/activity.module';
import { ActivityAdapter } from './activity.adapter';
import { SubscriptionPublishServiceModule } from '@services/subscriptions/subscription-publish-service';

@Module({
  imports: [
    ActivityModule,
    SubscriptionPublishServiceModule,
    TypeOrmModule.forFeature([Collaboration, Callout]),
  ],
  providers: [ActivityAdapter],
  exports: [ActivityAdapter],
})
export class ActivityAdapterModule {}
