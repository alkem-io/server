import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PushSubscription } from './push.subscription.entity';
import { PushSubscriptionResolverMutations } from './push.subscription.resolver.mutations';
import { PushSubscriptionResolverQueries } from './push.subscription.resolver.queries';
import { PushSubscriptionService } from './push.subscription.service';

@Module({
  imports: [TypeOrmModule.forFeature([PushSubscription])],
  providers: [
    PushSubscriptionService,
    PushSubscriptionResolverMutations,
    PushSubscriptionResolverQueries,
  ],
  exports: [PushSubscriptionService],
})
export class PushSubscriptionModule {}
