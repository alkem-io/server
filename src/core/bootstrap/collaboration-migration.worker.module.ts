import configuration from '@config/configuration';
import { buildRuntimeDataSourceOptions } from '@config/runtime.datasource.options';
import { WinstonConfigService } from '@config/winston.config';
import { Memo } from '@domain/common/memo/memo.entity';
import { Whiteboard } from '@domain/common/whiteboard/whiteboard.entity';
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
 * collaboration lifecycle dispatcher + digest-sweep schedulers never start),
 * every RabbitMQ consumer/`@MessagePattern`, the event bus, Redis, MCP,
 * GraphQL/Apollo, the REST controllers, OIDC/auth, and the app bootstrap. Booted
 * via `NestFactory.createApplicationContext` (no HTTP listener) from
 * `main.collaboration-migration.ts`. The only lifecycle effect is the TypeORM
 * DataSource pool connect (`FileServiceAdapter` connects lazily on first call).
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
    TypeOrmModule.forFeature([Memo, Whiteboard]),
    FileServiceAdapterModule,
  ],
  providers: [CollaborationMigrationService],
})
export class CollaborationMigrationWorkerModule {}
