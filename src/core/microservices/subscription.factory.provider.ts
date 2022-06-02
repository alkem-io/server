import { MessagingQueue } from '@common/enums/messaging.queue';
import { FactoryProvider, LoggerService } from '@nestjs/common';
import { PubSubEngine } from 'graphql-subscriptions';
import { ConfigService } from '@nestjs/config';
import { subscriptionFactory } from '@core/microservices/subscription.factory';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

export const subscriptionFactoryProvider = (
  provide: string,
  queueName: MessagingQueue
): FactoryProvider<Promise<PubSubEngine | undefined>> => ({
  provide,
  useFactory: (logger: LoggerService, configService: ConfigService) =>
    subscriptionFactory(logger, configService, queueName),
  inject: [WINSTON_MODULE_NEST_PROVIDER, ConfigService],
});
