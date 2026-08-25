import { ConfigService } from '@nestjs/config';
import { join } from 'path';
import { buildRuntimeDataSourceOptions } from './runtime.datasource.options';

// Characterization tests: lock the runtime DataSource options this helper produces
// to exactly what AppModule and AuthResetWorkerModule inlined before the
// extraction, and prove the runtime never applies schema migrations.

const makeConfig = (dbOptions: unknown): ConfigService<any, true> =>
  ({
    get: (key: string) => {
      if (key === 'storage.database') return dbOptions;
      throw new Error(`unexpected config key ${key}`);
    },
  }) as unknown as ConfigService<any, true>;

const FULL_DB = {
  host: 'db-host',
  port: 5432,
  username: 'user',
  password: 'pw',
  database: 'alkemio',
  logging: true,
  pool: { max: 77, idle_timeout_ms: 1111, connection_timeout_ms: 2222 },
  pgbouncer: { enabled: true, statement_timeout_ms: 4000 },
};

describe('buildRuntimeDataSourceOptions', () => {
  it('produces the exact runtime options with globs built from the source root', () => {
    const root = '/srv/src';
    const opts = buildRuntimeDataSourceOptions(
      makeConfig(FULL_DB),
      root
    ) as any;
    expect(opts.type).toBe('postgres');
    expect(opts.synchronize).toBe(false);
    expect(opts.cache).toBe(true);
    expect(opts.entities).toEqual([join(root, '**', '*.entity.{ts,js}')]);
    expect(opts.subscribers).toEqual([
      join(root, '**', '*.write.guard.{ts,js}'),
    ]);
    expect(opts.host).toBe('db-host');
    expect(opts.port).toBe(5432);
    expect(opts.username).toBe('user');
    expect(opts.password).toBe('pw');
    expect(opts.database).toBe('alkemio');
    expect(opts.logging).toBe(true);
    expect(opts.extra).toEqual({
      max: 77,
      idleTimeoutMillis: 1111,
      connectionTimeoutMillis: 2222,
      statement_timeout: 4000,
      idle_in_transaction_session_timeout: 8000,
    });
  });

  it('applies pool defaults and omits pgbouncer timeouts when pgbouncer is disabled/absent', () => {
    const opts = buildRuntimeDataSourceOptions(
      makeConfig({
        host: 'h',
        port: 1,
        username: 'u',
        password: 'p',
        database: 'd',
        logging: false,
      }),
      '/x'
    ) as any;
    expect(opts.extra).toEqual({
      max: 50,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });
    expect(opts.extra.statement_timeout).toBeUndefined();
    expect(opts.extra.idle_in_transaction_session_timeout).toBeUndefined();
  });

  it('never enables schema application: migrationsRun is false and no migrations glob is set', () => {
    const opts = buildRuntimeDataSourceOptions(
      makeConfig(FULL_DB),
      '/x'
    ) as any;
    expect(opts.migrationsRun).toBe(false);
    expect(opts.migrations).toBeUndefined();
  });

  it('yields identical effective options for both callers (AppModule __dirname vs AuthResetWorker join(__dirname,"..","..") resolve to the same src root)', () => {
    const appRoot = '/srv/src';
    const workerRoot = join('/srv/src/core/bootstrap', '..', '..'); // = /srv/src
    const a = buildRuntimeDataSourceOptions(makeConfig(FULL_DB), appRoot);
    const b = buildRuntimeDataSourceOptions(makeConfig(FULL_DB), workerRoot);
    expect(b).toEqual(a);
  });
});
