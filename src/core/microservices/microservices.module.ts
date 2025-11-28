import { ConfigModule, ConfigService } from '@nestjs/config';
import { Global, Module } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import {
  NOTIFICATIONS_SERVICE,
  MATRIX_ADAPTER_SERVICE,
  SUBSCRIPTION_CALLOUT_POST_CREATED,
  SUBSCRIPTION_DISCUSSION_UPDATED,
  SUBSCRIPTION_ROOM_EVENT,
  AUTH_RESET_SERVICE,
  SUBSCRIPTION_SUBSPACE_CREATED,
  SUBSCRIPTION_VIRTUAL_CONTRIBUTOR_UPDATED,
} from '@common/constants/providers';
import { MessagingQueue } from '@common/enums/messaging.queue';
import { RABBITMQ_EXCHANGE_NAME_DIRECT } from '@src/common/constants';
import { subscriptionFactoryProvider } from './subscription.factory.provider';

import { clientProxyFactory } from './client.proxy.factory';
import { APP_ID_PROVIDER } from '@common/app.id.provider';

const subscriptionConfig: { provide: string; queueName: MessagingQueue }[] = [
  {
    provide: SUBSCRIPTION_DISCUSSION_UPDATED,
    queueName: MessagingQueue.SUBSCRIPTION_DISCUSSION_UPDATED,
  },
  {
    provide: SUBSCRIPTION_CALLOUT_POST_CREATED,
    queueName: MessagingQueue.SUBSCRIPTION_CALLOUT_POST_CREATED,
  },
  {
    provide: SUBSCRIPTION_SUBSPACE_CREATED,
    queueName: MessagingQueue.SUBSCRIPTION_SUBSPACE_CREATED,
  },
  {
    provide: SUBSCRIPTION_ROOM_EVENT,
    queueName: MessagingQueue.SUBSCRIPTION_ROOM_EVENT,
  },
  {
    provide: SUBSCRIPTION_VIRTUAL_CONTRIBUTOR_UPDATED,
    queueName: MessagingQueue.SUBSCRIPTION_VIRTUAL_CONTRIBUTOR_UPDATED,
  },
];

const subscriptionFactoryProviders = subscriptionConfig.map(
  ({ provide, queueName }) =>
    subscriptionFactoryProvider(
      provide,
      queueName,
      RABBITMQ_EXCHANGE_NAME_DIRECT
    )
);

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    ...subscriptionFactoryProviders,
    {
      provide: NOTIFICATIONS_SERVICE,
      useFactory: clientProxyFactory(MessagingQueue.NOTIFICATIONS),
      inject: [WINSTON_MODULE_NEST_PROVIDER, ConfigService],
    },
    {
      provide: MATRIX_ADAPTER_SERVICE,
      useFactory: clientProxyFactory(MessagingQueue.MATRIX_ADAPTER),

      inject: [WINSTON_MODULE_NEST_PROVIDER, ConfigService],
    },
    {
      provide: AUTH_RESET_SERVICE,
      useFactory: clientProxyFactory(MessagingQueue.AUTH_RESET),
      inject: [WINSTON_MODULE_NEST_PROVIDER, ConfigService],
    },
    APP_ID_PROVIDER,
  ],
  exports: [
    ...subscriptionConfig.map(x => x.provide),
    NOTIFICATIONS_SERVICE,
    MATRIX_ADAPTER_SERVICE,
    AUTH_RESET_SERVICE,
  ],
})
export class MicroservicesModule {}
