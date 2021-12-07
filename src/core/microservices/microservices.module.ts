import { ConfigModule, ConfigService } from '@nestjs/config';
import { Global, Module } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { subscriptionPubSubFactory } from './subscription.pub-sub.factory';
import { notificationsServiceFactory } from './notifications.service.factory';
import { Challenge } from '@domain/challenge/challenge/challenge.entity';
import { Ecoverse } from '@domain/challenge/ecoverse/ecoverse.entity';
import { Opportunity } from '@domain/collaboration';
import { Communication } from '@domain/communication';
import { Discussion } from '@domain/communication/discussion/discussion.entity';
import { Community } from '@domain/community/community';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsPayloadBuilder } from './notifications.payload.builder';

export const SUBSCRIPTION_PUB_SUB = 'SUBSCRIPTION_PUB_SUB';
export const NOTIFICATIONS_SERVICE = 'NOTIFICATIONS_SERVICE';
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
  ],
  exports: [
    NotificationsPayloadBuilder,
    SUBSCRIPTION_PUB_SUB,
    NOTIFICATIONS_SERVICE,
  ],
})
export class MicroservicesModule {}
