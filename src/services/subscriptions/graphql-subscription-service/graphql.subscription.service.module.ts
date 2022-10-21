import { randomUUID } from 'crypto';
import { Module } from '@nestjs/common';
import {
  MessagingQueue,
  RABBITMQ_EXCHANGE_NAME_DIRECT,
  SUBSCRIPTION_ACTIVITY_CREATED,
} from '@src/common';
import { subscriptionFactoryProvider } from '@core/microservices/subscription.factory.provider';
import { GraphqlSubscriptionService } from './graphql.subscription.service';

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

// todo refactor so subscriptions are moved from the MicroservicesModule
@Module({
  imports: [],
  providers: [...subscriptionFactoryProviders, GraphqlSubscriptionService],
  exports: [GraphqlSubscriptionService],
})
export class GraphqlSubscriptionServiceModule {}
