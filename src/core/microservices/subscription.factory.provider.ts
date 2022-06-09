import { MessagingQueue } from '@common/enums/messaging.queue';
import { FactoryProvider, LoggerService } from '@nestjs/common';
import { PubSubEngine } from 'graphql-subscriptions';
import { ConfigService } from '@nestjs/config';
import { subscriptionFactory } from '@core/microservices/subscription.factory';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

/***
 * Creates a factory provider for a subscription
 * @param provide The injector token
 * @param queueName Queue name to which to subscribe
 * @param exchangeName Name of the exchange
 * @param trackingID Suffix to concatenate to the queue name and exchange.
 * This can be used for creating different queues and exchanges for different replicas of the running service.
 * Pro tip: Assigning a suffix per replica will improve tracking of queues. This can be further improved by passing the k8s replica UUID.
 */
export const subscriptionFactoryProvider = (
  provide: string,
  queueName: MessagingQueue,
  exchangeName: string,
  trackingID = ''
): FactoryProvider<Promise<PubSubEngine | undefined>> => ({
  provide,
  useFactory: (logger: LoggerService, configService: ConfigService) =>
    subscriptionFactory(
      logger,
      configService,
      exchangeName,
      trackingID ? `${queueName}-${trackingID}` : queueName
    ),
  inject: [WINSTON_MODULE_NEST_PROVIDER, ConfigService],
});
