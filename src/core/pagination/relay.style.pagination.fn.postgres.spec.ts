import { randomUUID } from 'node:crypto';
import {
  Column,
  DataSource,
  Entity,
  Generated,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { IPaginatedType } from './paginated.type';
import { PaginationArgs } from './pagination.args';
import { getPaginationResults } from './pagination.fn';

/**
 * Real-Postgres proof of the leading-boolean keyset: walks every page of a
 * mixed dataset forward and backward and checks each row comes back exactly
 * once, in `flag DESC, rowId <sort>` order. Runs only when
 * MIGRATION_TEST_DATABASE_URL is set; the table lives in a throwaway schema.
 */
const migrationDatabaseUrl = process.env.MIGRATION_TEST_DATABASE_URL;
const describePostgres = migrationDatabaseUrl ? describe : describe.skip;

const schema = `pagination_keyset_${randomUUID().replaceAll('-', '')}`;

@Entity({ name: 'pagination_keyset_row' })
class KeysetRow {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('int', { unique: true, nullable: false })
  @Generated('increment')
  rowId!: number;

  @Column('boolean', { nullable: false })
  flag!: boolean;
}

// Inserted in rowId order.
const FLAGS = [false, true, false, false, true, false, true, false, false];

describePostgres('leadingBooleanDesc pagination (PostgreSQL)', () => {
  let dataSource: DataSource;
  let rows: KeysetRow[];

  // The helper's generic bound asks for the full base entity; the throwaway
  // row has only the columns the keyset needs.
  const page = (args: PaginationArgs, sort: 'ASC' | 'DESC') =>
    getPaginationResults(
      dataSource.getRepository(KeysetRow).createQueryBuilder('row') as any,
      args,
      sort,
      { leadingBooleanDesc: 'flag' }
    ) as unknown as Promise<IPaginatedType<KeysetRow>>;

  const expectedOrder = (sort: 'ASC' | 'DESC') =>
    [...rows]
      .sort((a, b) =>
        a.flag !== b.flag
          ? a.flag
            ? -1
            : 1
          : sort === 'ASC'
            ? a.rowId - b.rowId
            : b.rowId - a.rowId
      )
      .map(r => r.id);

  beforeAll(async () => {
    const bootstrap = new DataSource({
      type: 'postgres',
      url: migrationDatabaseUrl,
    });
    await bootstrap.initialize();
    await bootstrap.query(`CREATE SCHEMA "${schema}"`);
    await bootstrap.destroy();

    dataSource = new DataSource({
      type: 'postgres',
      url: migrationDatabaseUrl,
      schema,
      entities: [KeysetRow],
      synchronize: true,
    });
    await dataSource.initialize();

    const repository = dataSource.getRepository(KeysetRow);
    rows = [];
    for (const flag of FLAGS) {
      rows.push(await repository.save(repository.create({ flag })));
    }
  });

  afterAll(async () => {
    if (dataSource?.isInitialized) {
      await dataSource.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
      await dataSource.destroy();
    }
  });

  for (const sort of ['ASC', 'DESC'] as const) {
    for (const size of [2, 4]) {
      it(`forward walk, sort ${sort}, page size ${size}: every row exactly once, promoted first`, async () => {
        const seen: string[] = [];
        let after: string | undefined;
        let hasPreviousOnLaterPages = true;
        for (let guard = 0; guard < 20; guard++) {
          const result = await page({ first: size, after }, sort);
          expect(result.total).toBe(FLAGS.length);
          seen.push(...result.items.map(i => i.id));
          if (after) {
            hasPreviousOnLaterPages &&= result.pageInfo.hasPreviousPage;
          } else {
            expect(result.pageInfo.hasPreviousPage).toBe(false);
          }
          if (!result.pageInfo.hasNextPage) break;
          after = result.pageInfo.endCursor;
        }

        expect(seen).toEqual(expectedOrder(sort));
        expect(new Set(seen).size).toBe(FLAGS.length);
        expect(hasPreviousOnLaterPages).toBe(true);
      });

      it(`backward walk, sort ${sort}, page size ${size}: the same sequence, reversed page by page`, async () => {
        const ordered = expectedOrder(sort);
        const lastId = ordered[ordered.length - 1];
        // Start from the end: everything strictly before the last row, then
        // prepend the last row itself.
        const pages: string[][] = [[lastId]];
        let before: string | undefined = lastId;
        for (let guard = 0; guard < 20; guard++) {
          const result = await page({ last: size, before }, sort);
          expect(result.items.length).toBeLessThanOrEqual(size);
          expect(result.pageInfo.hasNextPage).toBe(true);
          pages.unshift(result.items.map(i => i.id));
          if (!result.pageInfo.hasPreviousPage) break;
          before = result.pageInfo.startCursor;
        }

        expect(pages.flat()).toEqual(ordered);
      });
    }
  }

  it('the first page holds the promoted rows even though they sit mid-range by rowId', async () => {
    const result = await page({ first: 3 }, 'ASC');
    expect(result.items.map(i => i.flag)).toEqual([true, true, true]);
    expect(result.pageInfo.hasNextPage).toBe(true);
  });
});
