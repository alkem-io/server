import { MessagingQueue } from '@common/enums/messaging.queue';
import { FactoryProvider, LoggerService } from '@nestjs/common';
import { PubSubEngine } from 'graphql-subscriptions';
import { ConfigService } from '@nestjs/config';
import { subscriptionFactory } from '@core/microservices/subscription.factory';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { AlkemioConfig } from '@src/types';
import { APP_ID } from '@common/constants';

/***
 * Creates a factory provider for a subscription
 * @param provide The injector token
 * @param queueName Queue name to which to subscribe
 * @param exchangeName Name of the exchange
 * This can be used for creating different queues and exchanges for different replicas of the running service.
 * Pro tip: Each queue will be prefixed with a UUID which is the APP ID. This can be further improved by passing the k8s replica UUID.
 */
export const subscriptionFactoryProvider = (
  provide: string,
  queueName: MessagingQueue,
  exchangeName: string
): FactoryProvider<Promise<PubSubEngine | undefined>> => ({
  provide,
  useFactory: (
    appId: string,
    logger: LoggerService,
    configService: ConfigService<AlkemioConfig, true>
  ) =>
    subscriptionFactory(
      logger,
      configService,
      exchangeName,
      appId ? `${queueName}-${appId}` : queueName
    ),
  inject: [APP_ID, WINSTON_MODULE_NEST_PROVIDER, ConfigService],
});
