import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PushSubscription } from './push.subscription.entity';
import { PushSubscriptionService } from './push.subscription.service';
import { PushSubscriptionResolver } from './push.subscription.resolver';

@Module({
  imports: [TypeOrmModule.forFeature([PushSubscription])],
  providers: [PushSubscriptionService, PushSubscriptionResolver],
  exports: [PushSubscriptionService],
})
export class PushSubscriptionModule {}
