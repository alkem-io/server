import { ConfigModule, ConfigService } from '@nestjs/config';
import { PubSub } from 'apollo-server-express';
import { Global, Module } from '@nestjs/common';

export const PUB_SUB = 'PUB_SUB';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: PUB_SUB,
      useFactory: (_: ConfigService) => {
        // can move to redis (graphql-redis-subscriptions)
        return new PubSub();
      },
      inject: [ConfigService],
    },
  ],
  exports: [PUB_SUB],
})
export class SubscriptionModule {}
