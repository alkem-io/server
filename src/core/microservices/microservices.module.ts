import { ConfigModule, ConfigService } from '@nestjs/config';
import { Global, Module } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { randomUUID } from 'crypto';
import {
  NOTIFICATIONS_SERVICE,
  MATRIX_ADAPTER_SERVICE,
  SUBSCRIPTION_WHITEBOARD_CONTENT,
  SUBSCRIPTION_CALLOUT_POST_CREATED,
  WALLET_MANAGEMENT_SERVICE,
  SUBSCRIPTION_PROFILE_VERIFIED_CREDENTIAL,
  SUBSCRIPTION_DISCUSSION_UPDATED,
  SUBSCRIPTION_ROOM_EVENT,
  AUTH_RESET_SERVICE,
  EXCALIDRAW_PUBSUB_PROVIDER,
  SUBSCRIPTION_SUBSPACE_CREATED,
  VIRTUAL_CONTRIBUTOR_ENGINE_COMMUNITY_MANAGER,
  VIRTUAL_CONTRIBUTOR_ENGINE_EXPERT,
  VIRTUAL_CONTRIBUTOR_ENGINE_GUIDANCE,
  SUBSCRIPTION_WHITEBOARD_SAVED,
  SUBSCRIPTION_VIRTUAL_CONTRIBUTOR_UPDATED,
  VIRTUAL_CONTRIBUTOR_ENGINE_GENERIC,
  VIRTUAL_CONTRIBUTOR_ENGINE_OPENAI_ASSISTANT,
} from '@common/constants/providers';
import { MessagingQueue } from '@common/enums/messaging.queue';
import {
  RABBITMQ_EXCHANGE_EXCALIDRAW_EVENTS,
  RABBITMQ_EXCHANGE_NAME_DIRECT,
} from '@src/common/constants';
import { subscriptionFactoryProvider } from './subscription.factory.provider';

import { clientProxyFactory } from './client.proxy.factory';

const subscriptionConfig: { provide: string; queueName: MessagingQueue }[] = [
  {
    provide: SUBSCRIPTION_DISCUSSION_UPDATED,
    queueName: MessagingQueue.SUBSCRIPTION_DISCUSSION_UPDATED,
  },
  {
    provide: SUBSCRIPTION_WHITEBOARD_CONTENT,
    queueName: MessagingQueue.SUBSCRIPTION_WHITEBOARD_CONTENT,
  },
  {
    provide: SUBSCRIPTION_CALLOUT_POST_CREATED,
    queueName: MessagingQueue.SUBSCRIPTION_CALLOUT_POST_CREATED,
  },
  {
    provide: SUBSCRIPTION_PROFILE_VERIFIED_CREDENTIAL,
    queueName: MessagingQueue.SUBSCRIPTION_PROFILE_VERIFIED_CREDENTIAL,
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
    provide: SUBSCRIPTION_WHITEBOARD_SAVED,
    queueName: MessagingQueue.SUBSCRIPTION_WHITEBOARD_SAVED,
  },
  {
    provide: SUBSCRIPTION_VIRTUAL_CONTRIBUTOR_UPDATED,
    queueName: MessagingQueue.SUBSCRIPTION_VIRTUAL_CONTRIBUTOR_UPDATED,
  },
];

const trackingUUID = randomUUID();
const subscriptionFactoryProviders = subscriptionConfig.map(
  ({ provide, queueName }) =>
    subscriptionFactoryProvider(
      provide,
      queueName,
      RABBITMQ_EXCHANGE_NAME_DIRECT,
      trackingUUID
    )
);

const excalidrawPubSubFactoryProvider = subscriptionFactoryProvider(
  EXCALIDRAW_PUBSUB_PROVIDER,
  MessagingQueue.EXCALIDRAW_EVENTS,
  RABBITMQ_EXCHANGE_EXCALIDRAW_EVENTS,
  trackingUUID
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
      provide: WALLET_MANAGEMENT_SERVICE,
      useFactory: clientProxyFactory(MessagingQueue.WALLET_MANAGER),
      inject: [WINSTON_MODULE_NEST_PROVIDER, ConfigService],
    },
    {
      provide: VIRTUAL_CONTRIBUTOR_ENGINE_GUIDANCE,
      useFactory: clientProxyFactory(
        MessagingQueue.VIRTUAL_CONTRIBUTOR_ENGINE_GUIDANCE,
        false
      ),

      inject: [WINSTON_MODULE_NEST_PROVIDER, ConfigService],
    },
    {
      provide: VIRTUAL_CONTRIBUTOR_ENGINE_COMMUNITY_MANAGER,
      useFactory: clientProxyFactory(
        MessagingQueue.VIRTUAL_CONTRIBUTOR_ENGINE_COMMUNITY_MANAGER,
        false
      ),
      inject: [WINSTON_MODULE_NEST_PROVIDER, ConfigService],
    },
    {
      provide: VIRTUAL_CONTRIBUTOR_ENGINE_EXPERT,
      useFactory: clientProxyFactory(
        MessagingQueue.VIRTUAL_CONTRIBUTOR_ENGINE_EXPERT
      ),
      inject: [WINSTON_MODULE_NEST_PROVIDER, ConfigService],
    },
    {
      provide: VIRTUAL_CONTRIBUTOR_ENGINE_GENERIC,
      useFactory: clientProxyFactory(
        MessagingQueue.VIRTUAL_CONTRIBUTOR_ENGINE_GENERIC
      ),
      inject: [WINSTON_MODULE_NEST_PROVIDER, ConfigService],
    },
    {
      provide: VIRTUAL_CONTRIBUTOR_ENGINE_OPENAI_ASSISTANT,
      useFactory: clientProxyFactory(
        MessagingQueue.VIRTUAL_CONTRIBUTOR_ENGINE_OPENAI_ASSISTANT
      ),
      inject: [WINSTON_MODULE_NEST_PROVIDER, ConfigService],
    },
    {
      provide: AUTH_RESET_SERVICE,
      useFactory: clientProxyFactory(MessagingQueue.AUTH_RESET),
      inject: [WINSTON_MODULE_NEST_PROVIDER, ConfigService],
    },
    excalidrawPubSubFactoryProvider,
  ],
  exports: [
    ...subscriptionConfig.map(x => x.provide),
    NOTIFICATIONS_SERVICE,
    WALLET_MANAGEMENT_SERVICE,
    MATRIX_ADAPTER_SERVICE,
    VIRTUAL_CONTRIBUTOR_ENGINE_COMMUNITY_MANAGER,
    VIRTUAL_CONTRIBUTOR_ENGINE_EXPERT,
    VIRTUAL_CONTRIBUTOR_ENGINE_GENERIC,
    VIRTUAL_CONTRIBUTOR_ENGINE_OPENAI_ASSISTANT,
    VIRTUAL_CONTRIBUTOR_ENGINE_GUIDANCE,
    AUTH_RESET_SERVICE,
    EXCALIDRAW_PUBSUB_PROVIDER,
  ],
})
export class MicroservicesModule {}
