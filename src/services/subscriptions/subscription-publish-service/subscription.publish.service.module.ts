import { randomUUID } from 'crypto';
import { Module } from '@nestjs/common';
import {
  RABBITMQ_EXCHANGE_NAME_DIRECT,
  SUBSCRIPTION_ACTIVITY_CREATED,
} from '@src/common/constants';
import { subscriptionFactoryProvider } from '@core/microservices/subscription.factory.provider';
import { SubscriptionPublishService } from './subscription.publish.service';
import { SubscriptionReadService } from './subscription.read.service';
import { MessagingQueue } from '@common/enums/messaging.queue';

const subscriptionConfig: { provide: string; queueName: MessagingQueue }[] = [
  {
    provide: SUBSCRIPTION_ACTIVITY_CREATED,
    queueName: MessagingQueue.SUBSCRIPTION_ACTIVITY_CREATED,
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
  ],
  exports: [SubscriptionPublishService, SubscriptionReadService],
})
export class SubscriptionPublishServiceModule {}
