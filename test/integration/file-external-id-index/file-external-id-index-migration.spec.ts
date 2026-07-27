import { AddFileExternalIDIndex1784200000000 } from '@src/migrations/1784200000000-AddFileExternalIDIndex';
import type { QueryRunner } from 'typeorm';

interface MockOptions {
  existingIndexValid?: boolean;
  failOnCreate?: boolean;
}

const createMockQueryRunner = (
  initiallyActive: boolean,
  options: MockOptions = {}
) => {
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
      if (sql.includes('SELECT index_state.indisvalid')) {
        return options.existingIndexValid === undefined
          ? []
          : [{ isValid: options.existingIndexValid }];
      }
      if (options.failOnCreate && sql.startsWith('CREATE INDEX')) {
        throw new Error('index build failed');
      }
    },
  } as QueryRunner;

  return { events, runner };
};

describe('AddFileExternalIDIndex migration', () => {
  const migration = new AddFileExternalIDIndex1784200000000();

  it('creates and analyzes the index outside TypeORM’s surrounding transaction', async () => {
    const { events, runner } = createMockQueryRunner(true);

    await migration.up(runner);

    expect(events[0]).toBe('commit');
    expect(events[1]).toContain('SELECT index_state.indisvalid');
    expect(events.slice(2)).toEqual([
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS "IDX_file_externalID" ON "file" ("externalID")',
      'ANALYZE "file"',
      'start',
    ]);
    expect(runner.isTransactionActive).toBe(true);
  });

  it('drops an invalid remnant before retrying a failed concurrent build', async () => {
    const { events, runner } = createMockQueryRunner(true, {
      existingIndexValid: false,
    });

    await migration.up(runner);

    expect(events[0]).toBe('commit');
    expect(events[1]).toContain('SELECT index_state.indisvalid');
    expect(events.slice(2)).toEqual([
      'DROP INDEX CONCURRENTLY IF EXISTS "IDX_file_externalID"',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS "IDX_file_externalID" ON "file" ("externalID")',
      'ANALYZE "file"',
      'start',
    ]);
  });

  it('adopts an existing valid index without dropping it', async () => {
    const { events, runner } = createMockQueryRunner(true, {
      existingIndexValid: true,
    });

    await migration.up(runner);

    expect(events[0]).toBe('commit');
    expect(events[1]).toContain('SELECT index_state.indisvalid');
    expect(events).not.toContain(
      'DROP INDEX CONCURRENTLY IF EXISTS "IDX_file_externalID"'
    );
    expect(events.slice(2)).toEqual([
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS "IDX_file_externalID" ON "file" ("externalID")',
      'ANALYZE "file"',
      'start',
    ]);
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

    expect(events[0]).toContain('SELECT index_state.indisvalid');
    expect(events.slice(1)).toEqual([
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS "IDX_file_externalID" ON "file" ("externalID")',
      'ANALYZE "file"',
    ]);
    expect(runner.isTransactionActive).toBe(false);
  });

  it('restores the surrounding transaction when the concurrent statement fails', async () => {
    const { events, runner } = createMockQueryRunner(true, {
      failOnCreate: true,
    });

    await expect(migration.up(runner)).rejects.toThrow('index build failed');

    expect(events[0]).toBe('commit');
    expect(events[1]).toContain('SELECT index_state.indisvalid');
    expect(events.slice(2)).toEqual([
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS "IDX_file_externalID" ON "file" ("externalID")',
      'start',
    ]);
    expect(runner.isTransactionActive).toBe(true);
  });
});
