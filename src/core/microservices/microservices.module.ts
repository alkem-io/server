import { APP_ID_PROVIDER } from '@common/app.id.provider';
import {
  AUTH_RESET_SERVICE,
  IS_SCHEMA_BOOTSTRAP,
  MATRIX_ADAPTER_SERVICE,
  NOTIFICATIONS_SERVICE,
  SUBSCRIPTION_CALLOUT_POST_CREATED,
  SUBSCRIPTION_DISCUSSION_UPDATED,
  SUBSCRIPTION_ROOM_EVENT,
  SUBSCRIPTION_SUBSPACE_CREATED,
  SUBSCRIPTION_VIRTUAL_UPDATED,
} from '@common/constants/providers';
import { MessagingQueue } from '@common/enums/messaging.queue';
import { Global, Inject, Module, OnModuleDestroy } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RABBITMQ_EXCHANGE_NAME_DIRECT } from '@src/common/constants';
import { PubSubEngine } from 'graphql-subscriptions';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { clientProxyFactory } from './client.proxy.factory';
import { subscriptionFactoryProvider } from './subscription.factory.provider';

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
    provide: SUBSCRIPTION_VIRTUAL_UPDATED,
    queueName: MessagingQueue.SUBSCRIPTION_VIRTUAL_UPDATED,
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
    {
      provide: IS_SCHEMA_BOOTSTRAP,
      useValue: false,
    },
    APP_ID_PROVIDER,
  ],
  exports: [
    ...subscriptionConfig.map(x => x.provide),
    NOTIFICATIONS_SERVICE,
    MATRIX_ADAPTER_SERVICE,
    AUTH_RESET_SERVICE,
    IS_SCHEMA_BOOTSTRAP,
  ],
})
export class MicroservicesModule implements OnModuleDestroy {
  constructor(
    @Inject(SUBSCRIPTION_DISCUSSION_UPDATED)
    private readonly discussionUpdated: PubSubEngine,
    @Inject(SUBSCRIPTION_CALLOUT_POST_CREATED)
    private readonly calloutPostCreated: PubSubEngine,
    @Inject(SUBSCRIPTION_SUBSPACE_CREATED)
    private readonly subspaceCreated: PubSubEngine,
    @Inject(SUBSCRIPTION_ROOM_EVENT)
    private readonly roomEvent: PubSubEngine,
    @Inject(SUBSCRIPTION_VIRTUAL_UPDATED)
    private readonly virtualContributorUpdated: PubSubEngine
  ) {}

  async onModuleDestroy() {
    const pubSubs = [
      this.discussionUpdated,
      this.calloutPostCreated,
      this.subspaceCreated,
      this.roomEvent,
      this.virtualContributorUpdated,
    ];

    for (const pubSub of pubSubs) {
      if (pubSub) {
        if (typeof (pubSub as any).close === 'function') {
          await (pubSub as any).close();
        }

        if (
          (pubSub as any).connection &&
          typeof (pubSub as any).connection.close === 'function'
        ) {
          await (pubSub as any).connection.close();
        }
      }
    }
  }
}
