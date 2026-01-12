import { Module, OnModuleDestroy, Inject } from '@nestjs/common';
import {
  RABBITMQ_EXCHANGE_NAME_DIRECT,
  SUBSCRIPTION_ACTIVITY_CREATED,
  SUBSCRIPTION_IN_APP_NOTIFICATION_RECEIVED,
  SUBSCRIPTION_IN_APP_NOTIFICATION_COUNTER,
  SUBSCRIPTION_CONVERSATIONS_UNREAD_COUNT,
} from '@src/common/constants';
import { subscriptionFactoryProvider } from '@core/microservices/subscription.factory.provider';
import { SubscriptionPublishService } from './subscription.publish.service';
import { SubscriptionReadService } from './subscription.read.service';
import { MessagingQueue } from '@common/enums/messaging.queue';
import { APP_ID_PROVIDER } from '@common/app.id.provider';
import { PubSubEngine } from 'graphql-subscriptions';

const subscriptionConfig: { provide: string; queueName: MessagingQueue }[] = [
  {
    provide: SUBSCRIPTION_ACTIVITY_CREATED,
    queueName: MessagingQueue.SUBSCRIPTION_ACTIVITY_CREATED,
  },
  {
    provide: SUBSCRIPTION_IN_APP_NOTIFICATION_RECEIVED,
    queueName: MessagingQueue.SUBSCRIPTION_IN_APP_NOTIFICATION_RECEIVED,
  },
  {
    provide: SUBSCRIPTION_IN_APP_NOTIFICATION_COUNTER,
    queueName: MessagingQueue.SUBSCRIPTION_IN_APP_NOTIFICATION_COUNTER,
  },
  {
    provide: SUBSCRIPTION_CONVERSATIONS_UNREAD_COUNT,
    queueName: MessagingQueue.SUBSCRIPTION_CONVERSATIONS_UNREAD_COUNT,
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
// having the read and write service under one module is done in order
// to use the same topic with the same name
// right now topic names are generated on random so there isn't any way
// for the read service to guess which topic to consume
// todo refactor so subscriptions are moved from the MicroservicesModule
@Module({
  imports: [],
  providers: [
    ...subscriptionFactoryProviders,
    SubscriptionPublishService,
    SubscriptionReadService,
    APP_ID_PROVIDER,
  ],
  exports: [SubscriptionPublishService, SubscriptionReadService],
})
export class SubscriptionServiceModule implements OnModuleDestroy {
  constructor(
    @Inject(SUBSCRIPTION_ACTIVITY_CREATED)
    private readonly activityCreated: PubSubEngine,
    @Inject(SUBSCRIPTION_IN_APP_NOTIFICATION_RECEIVED)
    private readonly notificationReceived: PubSubEngine,
    @Inject(SUBSCRIPTION_IN_APP_NOTIFICATION_COUNTER)
    private readonly notificationCounter: PubSubEngine,
    @Inject(SUBSCRIPTION_CONVERSATIONS_UNREAD_COUNT)
    private readonly conversationsUnreadCount: PubSubEngine
  ) {}

  async onModuleDestroy() {
    const pubSubs = [
      this.activityCreated,
      this.notificationReceived,
      this.notificationCounter,
      this.conversationsUnreadCount,
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
