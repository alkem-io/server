import { APP_ID_PROVIDER } from '@common/app.id.provider';
import {
  AUTH_RESET_SERVICE,
  COLLABORATION_LIFECYCLE_SERVICE,
  COLLABORATION_SERVICE,
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
import {
  Global,
  Inject,
  LoggerService,
  Module,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RABBITMQ_EXCHANGE_NAME_DIRECT } from '@src/common/constants';
import { AlkemioConfig } from '@src/types';
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
      // Queue name comes from config (microservices.rabbitmq.auth_reset.queue)
      // so publisher and the dedicated worker consumer stay in lock-step.
      useFactory: (
        logger: LoggerService,
        configService: ConfigService<AlkemioConfig, true>
      ) => {
        const queue = configService.get(
          'microservices.rabbitmq.auth_reset.queue',
          { infer: true }
        );
        return clientProxyFactory(queue)(logger, configService);
      },
      inject: [WINSTON_MODULE_NEST_PROVIDER, ConfigService],
    },
    {
      provide: COLLABORATION_SERVICE,
      useFactory: clientProxyFactory(MessagingQueue.COLLABORATION_SERVICE),
      inject: [WINSTON_MODULE_NEST_PROVIDER, ConfigService],
    },
    {
      provide: COLLABORATION_LIFECYCLE_SERVICE,
      // Durable QUORUM queue + persistent messages: the transactional outbox
      // guarantees the event is recorded; a confirmed persistent publish keeps
      // it alive across a broker restart between claim and consume. Dedicated
      // queue — never COLLABORATION_SERVICE (the server's own responder). The
      // producer asserts this queue, so its declaration MUST be byte-equivalent
      // to collab-service's consumer: durable:true + { 'x-queue-type': 'quorum' }
      // and NOTHING else — Q1 itself carries no DLX/TTL (those live on the
      // consumer-owned retry/DLQ queues). The lifecycle TOPOLOGY has a RabbitMQ
      // >= 3.13.2 deployment floor: on 3.9 a quorum queue silently accepts but
      // never expires TTL/dead-letter args, so the consumer's retry tiers never
      // fire. Enforced at deploy (dev-orchestration upgrade + per-env
      // verification), not here.
      useFactory: clientProxyFactory(MessagingQueue.COLLABORATION_LIFECYCLE, {
        durable: true,
        persistent: true,
        queueArguments: { 'x-queue-type': 'quorum' },
      }),
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
    COLLABORATION_SERVICE,
    COLLABORATION_LIFECYCLE_SERVICE,
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
