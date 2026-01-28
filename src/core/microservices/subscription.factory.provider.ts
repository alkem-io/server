import { APP_ID, IS_SCHEMA_BOOTSTRAP } from '@common/constants';
import { MessagingQueue } from '@common/enums/messaging.queue';
import { subscriptionFactory } from '@core/microservices/subscription.factory';
import { FactoryProvider, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AlkemioConfig } from '@src/types';
import { PubSubEngine } from 'graphql-subscriptions';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

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
    configService: ConfigService<AlkemioConfig, true>,
    isBootstrap: boolean
  ) =>
    subscriptionFactory(
      logger,
      configService,
      exchangeName,
      appId ? `${queueName}-${appId}` : queueName,
      isBootstrap
    ),
  inject: [
    APP_ID,
    WINSTON_MODULE_NEST_PROVIDER,
    ConfigService,
    { token: IS_SCHEMA_BOOTSTRAP, optional: true },
  ],
});
