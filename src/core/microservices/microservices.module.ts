import { ConfigModule, ConfigService } from '@nestjs/config';
import { Global, Module } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { randomUUID } from 'crypto';
import {
  SUBSCRIPTION_ASPECT_COMMENT,
  NOTIFICATIONS_SERVICE,
  SUBSCRIPTION_DISCUSSION_MESSAGE,
  SUBSCRIPTION_UPDATE_MESSAGE,
  SUBSCRIPTION_CANVAS_CONTENT,
  SUBSCRIPTION_CALLOUT_ASPECT_CREATED,
  WALLET_MANAGEMENT_SERVICE,
  SUBSCRIPTION_DISCUSSION_UPDATED,
  SUBSCRIPTION_PROFILE_VERIFIED_CREDENTIAL,
  SUBSCRIPTION_CALLOUT_MESSAGE_CREATED,
  SUBSCRIPTION_OPPORTUNITY_CREATED,
  SUBSCRIPTION_CHALLENGE_CREATED,
} from '@common/constants/providers';
import { MessagingQueue } from '@common/enums/messaging.queue';
import { RABBITMQ_EXCHANGE_NAME_DIRECT } from '@src/common';
import { subscriptionFactoryProvider } from './subscription.factory.provider';
import { notificationsServiceFactory } from './notifications.service.factory';
import { walletManagerServiceFactory } from './wallet-manager.service.factory';

const subscriptionConfig: { provide: string; queueName: MessagingQueue }[] = [
  {
    provide: SUBSCRIPTION_DISCUSSION_MESSAGE,
    queueName: MessagingQueue.SUBSCRIPTION_DISCUSSION_MESSAGE,
  },
  {
    provide: SUBSCRIPTION_DISCUSSION_UPDATED,
    queueName: MessagingQueue.SUBSCRIPTION_DISCUSSION_UPDATED,
  },
  {
    provide: SUBSCRIPTION_UPDATE_MESSAGE,
    queueName: MessagingQueue.SUBSCRIPTION_UPDATE_MESSAGE,
  },
  {
    provide: SUBSCRIPTION_ASPECT_COMMENT,
    queueName: MessagingQueue.SUBSCRIPTION_ASPECT_COMMENT,
  },
  {
    provide: SUBSCRIPTION_CANVAS_CONTENT,
    queueName: MessagingQueue.SUBSCRIPTION_CANVAS_CONTENT,
  },
  {
    provide: SUBSCRIPTION_CALLOUT_ASPECT_CREATED,
    queueName: MessagingQueue.SUBSCRIPTION_CALLOUT_ASPECT_CREATED,
  },
  {
    provide: SUBSCRIPTION_PROFILE_VERIFIED_CREDENTIAL,
    queueName: MessagingQueue.SUBSCRIPTION_PROFILE_VERIFIED_CREDENTIAL,
  },
  {
    provide: SUBSCRIPTION_CALLOUT_MESSAGE_CREATED,
    queueName: MessagingQueue.SUBSCRIPTION_CALLOUT_MESSAGE_CREATED,
  },
  {
    provide: SUBSCRIPTION_OPPORTUNITY_CREATED,
    queueName: MessagingQueue.SUBSCRIPTION_OPPORTUNITY_CREATED,
  },
  {
    provide: SUBSCRIPTION_CHALLENGE_CREATED,
    queueName: MessagingQueue.SUBSCRIPTION_CHALLENGE_CREATED,
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

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    ...subscriptionFactoryProviders,
    {
      provide: NOTIFICATIONS_SERVICE,
      useFactory: notificationsServiceFactory,
      inject: [WINSTON_MODULE_NEST_PROVIDER, ConfigService],
    },
    {
      provide: WALLET_MANAGEMENT_SERVICE,
      useFactory: walletManagerServiceFactory,
      inject: [WINSTON_MODULE_NEST_PROVIDER, ConfigService],
    },
  ],
  exports: [
    ...subscriptionConfig.map(x => x.provide),
    NOTIFICATIONS_SERVICE,
    WALLET_MANAGEMENT_SERVICE,
    NOTIFICATIONS_SERVICE,
  ],
})
export class MicroservicesModule {}
