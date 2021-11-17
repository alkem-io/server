import { ConfigModule, ConfigService } from '@nestjs/config';
import { Global, Module } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { subscriptionPubSubFactory } from './subscription.pub-sub.factory';
import {
  NOTIFICATIONS_SERVICE,
  NOTIFICATIONS_SERVICE_OPTIONS,
  SUBSCRIPTION_PUB_SUB,
  WALLET_MANAGEMENT_SERVICE,
  WALLET_MANAGEMENT_SERVICE_OPTIONS,
} from '@common/constants/providers';
import { microserviceFactory } from './microservice.factory';

export type MicroserviceOptions = {
  queueName: string;
};

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
      useFactory: microserviceFactory,
      inject: [
        WINSTON_MODULE_NEST_PROVIDER,
        ConfigService,
        NOTIFICATIONS_SERVICE_OPTIONS,
      ],
    },
    {
      provide: WALLET_MANAGEMENT_SERVICE,
      useFactory: microserviceFactory,
      inject: [
        WINSTON_MODULE_NEST_PROVIDER,
        ConfigService,
        WALLET_MANAGEMENT_SERVICE_OPTIONS,
      ],
    },
    {
      provide: NOTIFICATIONS_SERVICE_OPTIONS,
      useValue: { queueName: 'alkemio-notifications' },
    },
    {
      provide: WALLET_MANAGEMENT_SERVICE_OPTIONS,
      useValue: { queueName: 'alkemio-wallet-manager' },
    },
  ],
  exports: [
    SUBSCRIPTION_PUB_SUB,
    NOTIFICATIONS_SERVICE,
    WALLET_MANAGEMENT_SERVICE,
  ],
})
export class MicroservicesModule {}
