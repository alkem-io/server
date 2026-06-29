import configuration from '@config/configuration';
import { WinstonConfigService } from '@config/winston.config';
import { GraphqlGuardModule } from '@core/authorization/graphql.guard.module';
import { MicroservicesModule } from '@core/microservices/microservices.module';
import { Cipher, EncryptionModule } from '@hedger/nestjs-encryption';
import { CacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthResetSubscriberModule } from '@services/auth-reset/subscriber/auth-reset.subscriber.module';
import { AlkemioConfig } from '@src/types';
import * as redisStore from 'cache-manager-redis-store';
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
    CacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService<AlkemioConfig, true>) => {
        const { host, port, timeout } = configService.get('storage.redis', {
          infer: true,
        });
        return {
          store: redisStore,
          host,
          port,
          redisOptions: { connectTimeout: timeout * 1000 },
        };
      },
      inject: [ConfigService],
    }),
    TypeOrmModule.forRootAsync({
      name: 'default',
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService<AlkemioConfig, true>) => {
        const dbOptions = configService.get('storage.database', {
          infer: true,
        });

        const pgbouncerEnabled = dbOptions.pgbouncer?.enabled ?? false;
        const statementTimeoutMs =
          dbOptions.pgbouncer?.statement_timeout_ms ?? 60000;

        return {
          type: 'postgres' as const,
          synchronize: false,
          cache: true,
          entities: [join(__dirname, '..', '..', '**', '*.entity.{ts,js}')],
          subscribers: [
            join(__dirname, '..', '..', '**', '*.write.guard.{ts,js}'),
          ],
          host: dbOptions.host,
          port: dbOptions.port,
          username: dbOptions.username,
          password: dbOptions.password,
          database: dbOptions.database,
          logging: dbOptions.logging,
          extra: {
            max: dbOptions.pool?.max ?? 50,
            idleTimeoutMillis: dbOptions.pool?.idle_timeout_ms ?? 30000,
            connectionTimeoutMillis:
              dbOptions.pool?.connection_timeout_ms ?? 10000,
            ...(pgbouncerEnabled && {
              statement_timeout: statementTimeoutMs,
              idle_in_transaction_session_timeout: statementTimeoutMs * 2,
            }),
          },
        };
      },
    }),
    WinstonModule.forRootAsync({
      useClass: WinstonConfigService,
    }),
    // Client proxies (publishers, lazy). Its GraphQL-subscription PubSub engines
    // would normally open a RabbitMQ connection+consumer each, but main.worker.ts
    // sets ALKEMIO_DISABLE_SUBSCRIPTIONS=true so subscriptionFactory returns
    // in-memory PubSub — the worker opens NO subscription connections.
    MicroservicesModule,
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
