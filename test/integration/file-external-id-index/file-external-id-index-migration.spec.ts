import { AddFileExternalIDIndex1784200000000 } from '@src/migrations/1784200000000-AddFileExternalIDIndex';
import type { QueryRunner } from 'typeorm';

const createMockQueryRunner = (initiallyActive: boolean) => {
  const events: string[] = [];
  let transactionActive = initiallyActive;

  const runner = {
    get isTransactionActive() {
      return transactionActive;
    },
    commitTransaction: async () => {
      events.push('commit');
      transactionActive = false;
    },
    startTransaction: async () => {
      events.push('start');
      transactionActive = true;
    },
    query: async (sql: string) => {
      events.push(sql);
    },
  } as QueryRunner;

  return { events, runner };
};

describe('AddFileExternalIDIndex migration', () => {
  const migration = new AddFileExternalIDIndex1784200000000();

  it('creates and analyzes the index outside TypeORM’s surrounding transaction', async () => {
    const { events, runner } = createMockQueryRunner(true);

    await migration.up(runner);

    expect(events).toEqual([
      'commit',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS "IDX_file_externalID" ON "file" ("externalID")',
      'ANALYZE "file"',
      'start',
    ]);
    expect(runner.isTransactionActive).toBe(true);
  });

  it('drops the migration-owned index concurrently outside the transaction', async () => {
    const { events, runner } = createMockQueryRunner(true);

    await migration.down(runner);

    expect(events).toEqual([
      'commit',
      'DROP INDEX CONCURRENTLY IF EXISTS "IDX_file_externalID"',
      'start',
    ]);
    expect(runner.isTransactionActive).toBe(true);
  });

  it('also works when the migration executor has no surrounding transaction', async () => {
    const { events, runner } = createMockQueryRunner(false);

    await migration.up(runner);

    expect(events).toEqual([
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS "IDX_file_externalID" ON "file" ("externalID")',
      'ANALYZE "file"',
    ]);
    expect(runner.isTransactionActive).toBe(false);
  });

  it('restores the surrounding transaction when the concurrent statement fails', async () => {
    const { events, runner } = createMockQueryRunner(true);
    runner.query = async (sql: string) => {
      events.push(sql);
      throw new Error('index build failed');
    };

    await expect(migration.up(runner)).rejects.toThrow('index build failed');

    expect(events).toEqual([
      'commit',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS "IDX_file_externalID" ON "file" ("externalID")',
      'start',
    ]);
    expect(runner.isTransactionActive).toBe(true);
  });
});
