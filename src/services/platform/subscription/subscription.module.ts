import { ConfigModule, ConfigService } from '@nestjs/config';
import { Global, Module } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { subscriptionPubSubFactory } from './subscription.pub-sub.factory';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { notificationsServiceFactory } from './notifications.service.factory';

export const SUBSCRIPTION_PUB_SUB = 'SUBSCRIPTION_PUB_SUB';
export const NOTIFICATIONS_SERVICE = 'NOTIFICATIONS_SERVICE';
@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: SUBSCRIPTION_PUB_SUB,
      useFactory: subscriptionPubSubFactory,
      inject: [WINSTON_MODULE_NEST_PROVIDER, ConfigService],
    },
    {
      provide: NOTIFICATIONS_SERVICE,
      useFactory: notificationsServiceFactory,
      inject: [WINSTON_MODULE_NEST_PROVIDER, ConfigService],
    },
  ],
  exports: [SUBSCRIPTION_PUB_SUB, NOTIFICATIONS_SERVICE],
})
export class SubscriptionModule {}
