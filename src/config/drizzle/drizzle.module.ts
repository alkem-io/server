import { LogContext } from '@common/enums/logging.context';
import { Global, Inject, LoggerService, Module, OnModuleDestroy } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import postgres from 'postgres';
import type { AlkemioConfig } from '@src/types';
import { DRIZZLE } from './drizzle.constants';
import * as schema from './schema';

const POSTGRES_CLIENT = Symbol('POSTGRES_CLIENT');

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: POSTGRES_CLIENT,
      inject: [ConfigService, WINSTON_MODULE_NEST_PROVIDER],
      useFactory: (
        configService: ConfigService<AlkemioConfig, true>,
        logger: LoggerService
      ) => {
        const dbOptions = configService.get('storage.database', {
          infer: true,
        });
        const pgbouncerEnabled = dbOptions.pgbouncer?.enabled ?? false;

        return postgres({
          host: dbOptions.host,
          port: dbOptions.port,
          user: dbOptions.username,
          password: dbOptions.password,
          database: dbOptions.database,
          max: dbOptions.pool?.max ?? 50,
          idle_timeout: (dbOptions.pool?.idle_timeout_ms ?? 30000) / 1000,
          connect_timeout:
            (dbOptions.pool?.connection_timeout_ms ?? 10000) / 1000,
          // PgBouncer compatibility: disable prepared statements
          prepare: !pgbouncerEnabled,
          debug: dbOptions.logging
            ? (connection, query) => {
                logger.verbose?.(
                  { message: 'Drizzle query', query },
                  LogContext.DATABASE
                );
              }
            : undefined,
        });
      },
    },
    {
      provide: DRIZZLE,
      inject: [POSTGRES_CLIENT],
      useFactory: (client: postgres.Sql) => {
        return drizzle(client, { schema });
      },
    },
  ],
  exports: [DRIZZLE],
})
export class DrizzleModule implements OnModuleDestroy {
  constructor(@Inject(POSTGRES_CLIENT) private readonly client: postgres.Sql) {}

  async onModuleDestroy() {
    await this.client.end();
  }
}
