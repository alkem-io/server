import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { AlkemioConfig } from '@src/types';
import { join } from 'path';

/**
 * Single source of truth for the runtime TypeORM DataSource options used by every
 * Nest application context that opens the Alkemio database (AppModule, the
 * restricted auth-reset worker, and future one-shot operator contexts). Extracted
 * verbatim from the previously duplicated inline `useFactory` bodies in
 * `app.module.ts` and `auth-reset.worker.module.ts` so the contexts can no longer
 * drift.
 *
 * `sourceRoot` is the ONLY parameter: the absolute path of the `src` root, used to
 * build the entity + write-guard-subscriber globs. Each caller passes its own
 * `__dirname`-derived root — they differ only by directory depth, and both resolve
 * to the same `src` tree, so the effective globs are identical.
 *
 * `migrationsRun` is forced to `false`: the runtime never applies schema
 * migrations (those run via the dedicated `typeorm.cli.config.run` CLI). This is
 * behaviour-preserving — the previous inline options omitted `migrationsRun`,
 * which TypeORM already defaults to `false` — and makes the invariant explicit.
 * There is deliberately no arbitrary-override parameter.
 */
export const buildRuntimeDataSourceOptions = (
  configService: ConfigService<AlkemioConfig, true>,
  sourceRoot: string
): TypeOrmModuleOptions => {
  const dbOptions = configService.get('storage.database', { infer: true });

  const pgbouncerEnabled = dbOptions.pgbouncer?.enabled ?? false;
  const statementTimeoutMs = dbOptions.pgbouncer?.statement_timeout_ms ?? 60000;

  return {
    type: 'postgres' as const,
    synchronize: false,
    migrationsRun: false,
    cache: true,
    entities: [join(sourceRoot, '**', '*.entity.{ts,js}')],
    subscribers: [join(sourceRoot, '**', '*.write.guard.{ts,js}')],
    host: dbOptions.host,
    port: dbOptions.port,
    username: dbOptions.username,
    password: dbOptions.password,
    database: dbOptions.database,
    logging: dbOptions.logging,
    // Connection pool settings for PostgreSQL
    extra: {
      max: dbOptions.pool?.max ?? 50,
      idleTimeoutMillis: dbOptions.pool?.idle_timeout_ms ?? 30000,
      connectionTimeoutMillis: dbOptions.pool?.connection_timeout_ms ?? 10000,
      // PgBouncer compatibility: set statement_timeout to prevent
      // long-running queries from holding pooled connections
      ...(pgbouncerEnabled && {
        statement_timeout: statementTimeoutMs,
        // Disable idle_in_transaction_session_timeout to let PgBouncer manage
        idle_in_transaction_session_timeout: statementTimeoutMs * 2,
      }),
    },
  };
};
