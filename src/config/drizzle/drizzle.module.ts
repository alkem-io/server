import { LogContext } from '@common/enums/logging.context';
import { Global, Inject, LoggerService, Module, OnModuleDestroy } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import type { Logger as DrizzleLogger } from 'drizzle-orm/logger';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import postgres from 'postgres';
import type { AlkemioConfig } from '@src/types';
import { DRIZZLE } from './drizzle.constants';
import * as schema from './schema';

const POSTGRES_CLIENT = Symbol('POSTGRES_CLIENT');

/**
 * Drizzle query tracer — logs every SQL statement with a sequential number
 * and elapsed time since the first query in the current "burst".
 * Enable via ENABLE_ORM_LOGGING=true.
 *
 * A burst resets after 500 ms of silence, which roughly aligns with a
 * single GraphQL request.
 */
class QueryTracer implements DrizzleLogger {
  private seq = 0;
  private burstStart = 0;
  private lastQueryTime = 0;
  private static readonly BURST_GAP_MS = 500;

  constructor(private readonly logger: LoggerService) {}

  logQuery(query: string, params: unknown[]): void {
    const now = performance.now();

    // Reset burst counter after a gap
    if (now - this.lastQueryTime > QueryTracer.BURST_GAP_MS) {
      if (this.seq > 0) {
        this.logger.verbose?.(
          `--- burst end: ${this.seq} queries in ${(this.lastQueryTime - this.burstStart).toFixed(1)} ms ---`,
          LogContext.DATABASE
        );
      }
      this.seq = 0;
      this.burstStart = now;
    }
    this.lastQueryTime = now;
    this.seq++;

    const elapsed = (now - this.burstStart).toFixed(1);
    // Truncate long queries for readability
    const short = query.length > 200 ? `${query.slice(0, 200)}…` : query;
    this.logger.verbose?.(
      `[Q${this.seq} +${elapsed}ms] ${short}`,
      LogContext.DATABASE
    );
  }
}

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
        });
      },
    },
    {
      provide: DRIZZLE,
      inject: [POSTGRES_CLIENT, WINSTON_MODULE_NEST_PROVIDER, ConfigService],
      useFactory: (
        client: postgres.Sql,
        logger: LoggerService,
        configService: ConfigService<AlkemioConfig, true>
      ) => {
        const dbOptions = configService.get('storage.database', {
          infer: true,
        });
        return drizzle(client, {
          schema,
          logger: dbOptions.logging ? new QueryTracer(logger) : false,
        });
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
