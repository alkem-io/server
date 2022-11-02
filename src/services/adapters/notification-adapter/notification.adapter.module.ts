import { Challenge } from '@domain/challenge/challenge/challenge.entity';
import { Hub } from '@domain/challenge/hub/hub.entity';
import { Aspect } from '@domain/collaboration/aspect/aspect.entity';
import { Opportunity } from '@domain/collaboration/opportunity/opportunity.entity';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EntityResolverModule } from '@services/infrastructure/entity-resolver/entity.resolver.module';
import { ActivityModule } from '@src/platform/activity/activity.module';
import { NotificationAdapter } from './notification.adapter';
import { NotificationPayloadBuilder } from './notification.payload.builder';

@Module({
  imports: [
    ActivityModule,
    EntityResolverModule,
    TypeOrmModule.forFeature([Hub, Challenge, Opportunity, Aspect]),
  ],
  providers: [NotificationAdapter, NotificationPayloadBuilder],
  exports: [NotificationAdapter],
})
export class NotificationAdapterModule {}
