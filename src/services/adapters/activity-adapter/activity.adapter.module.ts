import { Callout } from '@domain/collaboration/callout/callout.entity';
import { Collaboration } from '@domain/collaboration/collaboration/collaboration.entity';
import { Memo } from '@domain/common/memo/memo.entity';
import { Whiteboard } from '@domain/common/whiteboard/whiteboard.entity';
import { Community } from '@domain/community/community/community.entity';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EntityResolverModule } from '@services/infrastructure/entity-resolver/entity.resolver.module';
import { SubscriptionServiceModule } from '@services/subscriptions/subscription-service';
import { ActivityModule } from '@src/platform/activity/activity.module';
import { ActivityAdapter } from './activity.adapter';

@Module({
  imports: [
    ActivityModule,
    SubscriptionServiceModule,
    EntityResolverModule,
    TypeOrmModule.forFeature([
      Collaboration,
      Community,
      Callout,
      Whiteboard,
      Memo,
    ]),
  ],
  providers: [ActivityAdapter],
  exports: [ActivityAdapter],
})
export class ActivityAdapterModule {}
