import configuration from '@config/configuration';
import { buildRuntimeDataSourceOptions } from '@config/runtime.datasource.options';
import { WinstonConfigService } from '@config/winston.config';
import { GraphqlGuardModule } from '@core/authorization/graphql.guard.module';
import { CalloutContributionDefaults } from '@domain/collaboration/callout-contribution-defaults/callout.contribution.defaults.entity';
import { Memo } from '@domain/common/memo/memo.entity';
import { Whiteboard } from '@domain/common/whiteboard/whiteboard.entity';
import { DocumentModule } from '@domain/storage/document/document.module';
import { StorageBucketModule } from '@domain/storage/storage-bucket/storage.bucket.module';
import { CacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FileServiceAdapterModule } from '@services/adapters/file-service-adapter/file.service.adapter.module';
import { CollaborationMigrationService } from '@services/collaboration-integration/migration';
import { AlkemioConfig } from '@src/types';
import { WinstonModule } from 'nest-winston';
import { join } from 'path';

/**
 * Minimal one-shot operator context for the 006 legacy-content back-fill +
 * verification (Release A). Imports ONLY what `CollaborationMigrationService`
 * needs: config, Winston, the DB (via the shared runtime options helper, which
 * forces `migrationsRun:false` — the operator NEVER applies schema migrations),
 * the Memo/Whiteboard repos, and `FileServiceAdapter`.
 *
 * Deliberately excluded (§12 side-effect trace): `ScheduleModule` (so the
 * collaboration lifecycle publisher is inert because this worker never deletes),
 * every RabbitMQ consumer/`@MessagePattern`, the event bus, Redis, MCP, the
 * GraphQL/Apollo HTTP LISTENER, the REST controllers, OIDC/session authentication,
 * and the app bootstrap (authorization IS now present via `GraphqlGuardModule`,
 * below). Booted via `NestFactory.createApplicationContext` (no HTTP listener)
 * from `main.collaboration-migration.ts`. The only lifecycle effect is the TypeORM
 * DataSource pool connect (`FileServiceAdapter` connects lazily on first call).
 *
 * `GraphqlGuardModule` IS imported (NOT the Apollo listener): `StorageBucketModule`
 * bundles GraphQL resolvers whose fields carry `@UseGuards(GraphqlGuard)`, so Nest
 * instantiates that guard even in this listener-less context. `GraphqlGuardModule`
 * is the `@Global` architectural owner of the guard (it re-exports
 * `AuthorizationModule` + `ActorContextModule`), so a module using `@UseGuards`
 * never wires the guard's deps itself — the same pattern `AuthResetWorkerModule`
 * uses for this exact isolated-worker problem. Its imports are pure DI
 * (`AuthorizationModule`; `ActorContextModule` → `ActorLookupModule`) — no
 * scheduler/RMQ/Redis/GraphQL-HTTP — so the one-shot context stays side-effect-free.
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: ['.env'],
      isGlobal: true,
      load: [configuration],
    }),
    WinstonModule.forRootAsync({
      useClass: WinstonConfigService,
    }),
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
    TypeOrmModule.forFeature([Memo, Whiteboard, CalloutContributionDefaults]),
    FileServiceAdapterModule,
    // In-memory (no-store) cache purely to satisfy the global `CACHE_MANAGER`
    // token that `StorageBucketService`'s transitive `UrlGeneratorCacheService`
    // injects. The migration never calls the URL generator, so this cache is
    // never exercised; it is NOT Redis and opens no connection — the one-shot
    // context stays side-effect-free.
    CacheModule.register({ isGlobal: true }),
    // Provides `DocumentService`, used to resolve legacy whiteboard media URLs
    // (`BinaryFileData.url`) to file-service document-id locators during the
    // whiteboard back-fill.
    DocumentModule,
    // Provides `StorageBucketService`, used to UP-HOME legacy inline `dataURL`
    // whiteboard media into the whiteboard's own bucket as a real authorized
    // file-service document (so dataURL-only assets survive the migration instead
    // of being silently dropped). Its transitive imports (authorization / tagset /
    // document / url-generator / avatar-creator / file-service) are all pure DI
    // service modules — no scheduler, RMQ, Redis, GraphQL or HTTP listener — so the
    // one-shot context stays side-effect-free (only the shared DataSource pool
    // connects; `FileServiceAdapter` connects lazily on first call).
    StorageBucketModule,
    // The `@Global` architectural owner of `GraphqlGuard` (see the class doc):
    // required because `StorageBucketModule` bundles GraphQL resolvers whose fields
    // carry `@UseGuards(GraphqlGuard)`, which Nest instantiates even here. Re-exports
    // `AuthorizationModule` + `ActorContextModule`; pure DI, no HTTP/RMQ/Redis. Same
    // pattern `AuthResetWorkerModule` uses for its isolated worker.
    GraphqlGuardModule,
  ],
  providers: [CollaborationMigrationService],
})
export class CollaborationMigrationWorkerModule {}
