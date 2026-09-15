import configuration from '@config/configuration';
import { buildRuntimeDataSourceOptions } from '@config/runtime.datasource.options';
import { WinstonConfigService } from '@config/winston.config';
import { GraphqlGuardModule } from '@core/authorization/graphql.guard.module';
import { redisCacheModule } from '@core/cache/redis.cache.module';
import { Cipher, EncryptionModule } from '@hedger/nestjs-encryption';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthResetSubscriberModule } from '@services/auth-reset/subscriber/auth-reset.subscriber.module';
import { AlkemioConfig } from '@src/types';
import { WinstonModule } from 'nest-winston';
import { join } from 'path';
import { WorkerEventBusModule } from './worker.event-bus.module';

/**
 * Restricted root module for the dedicated auth-reset worker (src/main.worker.ts).
 *
 * It loads ONLY what the authorization/license reset consumer needs: the shared
 * infrastructure (config, database, cache, event bus, logging, encryption,
 * RabbitMQ client proxies) plus AuthResetSubscriberModule. It deliberately does
 * NOT import GraphQLModule/Apollo, the REST controllers, OIDC/authentication,
 * BootstrapModule (seeding) or any resolver module — none of that is needed to
 * consume the queue, and skipping it keeps the worker lean and fast to boot.
 *
 * Infrastructure blocks below are kept in sync with AppModule's root setup.
 */
@Module({
  imports: [
    EncryptionModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService<AlkemioConfig, true>) => {
        const key = configService.get('security.encryption_key', {
          infer: true,
        });
        return {
          key,
          cipher: Cipher.AES_256_CBC,
        };
      },
    }),
    ConfigModule.forRoot({
      envFilePath: ['.env'],
      isGlobal: true,
      load: [configuration],
    }),
    // Required: CommunicationAdapterEventService (in the reset graph) injects
    // EventEmitter2, and domain services emit lifecycle events through it.
    EventEmitterModule.forRoot({
      global: true,
    }),
    // NOTE: ScheduleModule is deliberately NOT imported. Nothing in the reset
    // graph injects SchedulerRegistry, and omitting it means the only @Cron in
    // the graph (PushSubscriptionService stale-subscription cleanup) is never
    // wired, so the worker runs reset work ONLY. Do not add it back.
    // Literally the same module definition AppModule imports, so the two can no
    // longer drift. The previous two copies each built an unguarded redis
    // client, so a Redis blip killed this worker exactly as it killed the API
    // (#6330).
    redisCacheModule(),
    TypeOrmModule.forRootAsync({
      name: 'default',
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService<AlkemioConfig, true>) =>
        buildRuntimeDataSourceOptions(
          configService,
          join(__dirname, '..', '..')
        ),
    }),
    WinstonModule.forRootAsync({
      useClass: WinstonConfigService,
    }),
    // In-process CQRS EventBus only (no AI event-bus RabbitMQ connection). The
    // full EventBusModule is deliberately NOT in this graph.
    WorkerEventBusModule,
    // @Global — provides GraphqlGuard (+ re-exports AuthorizationModule and
    // ActorContextModule) that domain modules using @UseGuards(GraphqlGuard)
    // silently depend on. Ambient global AppModule supplies.
    GraphqlGuardModule,
    AuthResetSubscriberModule,
  ],
})
export class AuthResetWorkerModule {}
