import { ConfigModule, ConfigService } from '@nestjs/config';
import { Global, Module } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { subscriptionPubSubFactory } from './subscription.pub-sub.factory';
import { notificationsServiceFactory } from './notifications.service.factory';
import { walletManagerServiceFactory } from './wallet-manager.service.factory';
import {
  NOTIFICATIONS_SERVICE,
  SUBSCRIPTION_PUB_SUB,
  WALLET_MANAGEMENT_SERVICE,
} from '@common/constants/providers';

export type MicroserviceOptions = {
  queueName: string;
};
import { Challenge } from '@domain/challenge/challenge/challenge.entity';
import { Ecoverse } from '@domain/challenge/ecoverse/ecoverse.entity';
import { Opportunity } from '@domain/collaboration';
import { Communication } from '@domain/communication';
import { Discussion } from '@domain/communication/discussion/discussion.entity';
import { Community } from '@domain/community/community';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsPayloadBuilder } from './notifications.payload.builder';

@Global()
@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([Ecoverse]),
    TypeOrmModule.forFeature([Challenge]),
    TypeOrmModule.forFeature([Opportunity]),
    TypeOrmModule.forFeature([Community]),
    TypeOrmModule.forFeature([Discussion]),
    TypeOrmModule.forFeature([Communication]),
  ],
  providers: [
    NotificationsPayloadBuilder,

    {
      provide: SUBSCRIPTION_PUB_SUB,
      useFactory: subscriptionPubSubFactory,
      inject: [WINSTON_MODULE_NEST_PROVIDER, ConfigService],
    },
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
    SUBSCRIPTION_PUB_SUB,
    NOTIFICATIONS_SERVICE,
    WALLET_MANAGEMENT_SERVICE,
    NOTIFICATIONS_SERVICE,
    NotificationsPayloadBuilder,
  ],
})
export class MicroservicesModule {}
