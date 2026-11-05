import {
  EntityNotFoundException,
  PaginationInputOutOfBoundException,
  PaginationParameterNotFoundException,
} from '@src/common/exceptions';
import { IBaseAlkemio } from '@src/domain/common/entity/base-entity';
import { Brackets, type SelectQueryBuilder } from 'typeorm';
import { vi } from 'vitest';
import { PaginationArgs } from './pagination.args';
import {
  getRelayStylePaginationResults,
  type Paginationable,
} from './relay.style.pagination.fn';

type TestEntity = IBaseAlkemio & Paginationable;

/**
 * Creates a mock SelectQueryBuilder with chainable methods.
 * The `getMany` and `getCount` results can be configured per-call.
 */
function createMockQueryBuilder(opts?: {
  getManyResults?: TestEntity[][];
  getCountResults?: number[];
  getOneResult?: TestEntity | null;
  alias?: string;
}) {
  const getManyResults = opts?.getManyResults ?? [[]];
  const getCountResults = opts?.getCountResults ?? [0, 0];
  const alias = opts?.alias ?? 'entity';

  let getManyCallIndex = 0;
  let getCountCallIndex = 0;

  const qb: any = {
    alias,
    expressionMap: {
      orderBys: {},
      wheres: [],
    },
    orderBy: vi.fn().mockImplementation(function (this: any) {
      return this;
    }),
    addOrderBy: vi.fn().mockImplementation(function (this: any) {
      return this;
    }),
    where: vi.fn().mockImplementation(function (this: any) {
      return this;
    }),
    andWhere: vi.fn().mockImplementation(function (this: any) {
      return this;
    }),
    take: vi.fn().mockImplementation(function (this: any) {
      return this;
    }),
    clone: vi.fn().mockImplementation(function (this: any) {
      // Return a new mock with same results but independent call tracking
      return createMockQueryBuilder({
        getManyResults: getManyResults.slice(getManyCallIndex),
        getCountResults: getCountResults.slice(getCountCallIndex),
        getOneResult: opts?.getOneResult,
        alias,
      });
    }),
    getMany: vi.fn().mockImplementation(() => {
      const result =
        getManyResults[getManyCallIndex] ??
        getManyResults[getManyResults.length - 1] ??
        [];
      getManyCallIndex++;
      return Promise.resolve(result);
    }),
    getOne: vi.fn().mockImplementation(() => {
      return Promise.resolve(opts?.getOneResult ?? null);
    }),
    getCount: vi.fn().mockImplementation(() => {
      const result =
        getCountResults[getCountCallIndex] ??
        getCountResults[getCountResults.length - 1] ??
        0;
      getCountCallIndex++;
      return Promise.resolve(result);
    }),
  };

  return qb as SelectQueryBuilder<TestEntity>;
}

describe('getRelayStylePaginationResults', () => {
  const entity1: TestEntity = {
    id: 'aaa-111',
    rowId: 1,
    createdDate: new Date(),
    updatedDate: new Date(),
    authorization: undefined,
  } as any;

  const entity2: TestEntity = {
    id: 'bbb-222',
    rowId: 2,
    createdDate: new Date(),
    updatedDate: new Date(),
    authorization: undefined,
  } as any;

  const entity3: TestEntity = {
    id: 'ccc-333',
    rowId: 3,
    createdDate: new Date(),
    updatedDate: new Date(),
    authorization: undefined,
  } as any;

  describe('basic pagination (no cursors)', () => {
    it('should return empty result when no items exist', async () => {
      const qb = createMockQueryBuilder({
        getManyResults: [[], []],
        getCountResults: [0, 0],
      });

      const result = await getRelayStylePaginationResults(
        qb,
        {} as PaginationArgs
      );

      expect(result.edges).toEqual([]);
      expect(result.pageInfo.hasNextPage).toBe(false);
      expect(result.pageInfo.hasPreviousPage).toBe(false);
    });

    it('should return edges wrapping entities', async () => {
      const qb = createMockQueryBuilder({
        getManyResults: [
          [entity1, entity2],
          [entity1, entity2],
        ],
        getCountResults: [0, 0],
      });

      const result = await getRelayStylePaginationResults(
        qb,
        {} as PaginationArgs
      );

      expect(result.edges).toHaveLength(2);
      expect(result.edges[0].node).toEqual(entity1);
      expect(result.edges[1].node).toEqual(entity2);
    });

    it('should set startCursor and endCursor from result', async () => {
      const qb = createMockQueryBuilder({
        getManyResults: [
          [entity1, entity2, entity3],
          [entity1, entity2, entity3],
        ],
        getCountResults: [0, 0],
      });

      const result = await getRelayStylePaginationResults(
        qb,
        {} as PaginationArgs
      );

      expect(result.pageInfo.startCursor).toBe('aaa-111');
      expect(result.pageInfo.endCursor).toBe('ccc-333');
    });

    it('should compute pageInfo hasNextPage and hasPreviousPage', async () => {
      const qb = createMockQueryBuilder({
        getManyResults: [[entity1], [entity1]],
        getCountResults: [0, 0],
      });

      const result = await getRelayStylePaginationResults(qb, {
        first: 1,
      } as PaginationArgs);

      // With 0 counts before and after, both should be false
      expect(result.pageInfo.hasNextPage).toBe(false);
      expect(result.pageInfo.hasPreviousPage).toBe(false);
    });
  });

  describe('first / last limit', () => {
    it('should apply take with first parameter', async () => {
      const qb = createMockQueryBuilder({
        getManyResults: [[entity1], [entity1]],
        getCountResults: [0, 0],
      });

      await getRelayStylePaginationResults(qb, {
        first: 5,
      } as PaginationArgs);

      expect(qb.take).toHaveBeenCalledWith(5);
    });

    it('should apply take with last parameter', async () => {
      const qb = createMockQueryBuilder({
        getManyResults: [[entity3], [entity3]],
        getCountResults: [0, 0],
      });

      await getRelayStylePaginationResults(qb, {
        last: 3,
      } as PaginationArgs);

      expect(qb.take).toHaveBeenCalledWith(3);
    });

    it('should use default page size (25) when neither first nor last is provided', async () => {
      const qb = createMockQueryBuilder({
        getManyResults: [[], []],
        getCountResults: [0, 0],
      });

      await getRelayStylePaginationResults(qb, {} as PaginationArgs);

      expect(qb.take).toHaveBeenCalledWith(25);
    });
  });

  describe('sort direction', () => {
    it('should default to ASC sort', async () => {
      const qb = createMockQueryBuilder({
        getManyResults: [[], []],
        getCountResults: [0, 0],
      });

      await getRelayStylePaginationResults(qb, {} as PaginationArgs);

      expect(qb.orderBy).toHaveBeenCalledWith({
        'entity.rowId': 'ASC',
      });
    });

    it('should use DESC sort when specified', async () => {
      const qb = createMockQueryBuilder({
        getManyResults: [[], []],
        getCountResults: [0, 0],
      });

      await getRelayStylePaginationResults(qb, {} as PaginationArgs, 'DESC');

      expect(qb.orderBy).toHaveBeenCalledWith({
        'entity.rowId': 'DESC',
      });
    });
  });

  describe('existing order by clauses', () => {
    it('should preserve existing orderBy and add rowId as secondary', async () => {
      const qb = createMockQueryBuilder({
        getManyResults: [[], []],
        getCountResults: [0, 0],
      });
      // Simulate existing orderBy
      qb.expressionMap.orderBys = { 'entity.name': 'ASC' } as any;

      await getRelayStylePaginationResults(qb, {} as PaginationArgs);

      expect(qb.addOrderBy).toHaveBeenCalledWith('entity.rowId', 'ASC');
      expect(qb.orderBy).not.toHaveBeenCalled();
    });

    it('should not add rowId again if already in existing orderBys', async () => {
      const qb = createMockQueryBuilder({
        getManyResults: [[], []],
        getCountResults: [0, 0],
      });
      qb.expressionMap.orderBys = { 'entity.rowId': 'ASC' } as any;

      await getRelayStylePaginationResults(qb, {} as PaginationArgs);

      expect(qb.addOrderBy).not.toHaveBeenCalled();
      expect(qb.orderBy).not.toHaveBeenCalled();
    });
  });

  describe('cursor-based navigation with after', () => {
    it('should resolve rowId from cursor and navigate forward', async () => {
      // The clone for getRowIdFromCursor needs to find the entity
      const qb = createMockQueryBuilder({
        getManyResults: [
          [entity2, entity3],
          [entity2, entity3],
        ],
        getCountResults: [1, 0],
        getOneResult: entity1, // cursor resolves to entity1
      });

      const _result = await getRelayStylePaginationResults(qb, {
        first: 2,
        after: 'aaa-111',
      } as PaginationArgs);

      // Should have called clone for cursor lookup
      expect(qb.clone).toHaveBeenCalled();
    });
  });

  describe('validation errors', () => {
    it('should throw when first is 0', async () => {
      const qb = createMockQueryBuilder();

      await expect(
        getRelayStylePaginationResults(qb, {
          first: 0,
        } as PaginationArgs)
      ).rejects.toThrow(PaginationInputOutOfBoundException);
    });

    it('should throw when first is negative', async () => {
      const qb = createMockQueryBuilder();

      await expect(
        getRelayStylePaginationResults(qb, {
          first: -1,
        } as PaginationArgs)
      ).rejects.toThrow(PaginationInputOutOfBoundException);
    });

    it('should throw when last is 0', async () => {
      const qb = createMockQueryBuilder();

      await expect(
        getRelayStylePaginationResults(qb, {
          last: 0,
        } as PaginationArgs)
      ).rejects.toThrow(PaginationInputOutOfBoundException);
    });

    it('should throw when after is provided without first', async () => {
      const qb = createMockQueryBuilder();

      await expect(
        getRelayStylePaginationResults(qb, {
          after: 'some-cursor',
        } as PaginationArgs)
      ).rejects.toThrow(PaginationParameterNotFoundException);
    });

    it('should throw when before is provided without last', async () => {
      const qb = createMockQueryBuilder();

      await expect(
        getRelayStylePaginationResults(qb, {
          before: 'some-cursor',
        } as PaginationArgs)
      ).rejects.toThrow(PaginationParameterNotFoundException);
    });

    it('should throw when both first and last are provided', async () => {
      const qb = createMockQueryBuilder();

      await expect(
        getRelayStylePaginationResults(qb, {
          first: 5,
          last: 5,
        } as PaginationArgs)
      ).rejects.toThrow(PaginationInputOutOfBoundException);
    });
  });

  describe('cursor not found', () => {
    it('should throw EntityNotFoundException when after cursor is not found', async () => {
      const qb = createMockQueryBuilder({
        getOneResult: null, // cursor not found
      });

      await expect(
        getRelayStylePaginationResults(qb, {
          first: 5,
          after: 'non-existent-id',
        } as PaginationArgs)
      ).rejects.toThrow(EntityNotFoundException);
    });

    it('should throw EntityNotFoundException when before cursor is not found', async () => {
      const qb = createMockQueryBuilder({
        getOneResult: null,
      });

      await expect(
        getRelayStylePaginationResults(qb, {
          last: 5,
          before: 'non-existent-id',
        } as PaginationArgs)
      ).rejects.toThrow(EntityNotFoundException);
    });
  });

  describe('leadingBooleanDesc', () => {
    type Row = TestEntity & { promote: boolean };

    const row = (rowId: number, promote: boolean): Row =>
      ({ id: `id-${rowId}`, rowId, promote }) as any;

    /**
     * A recording builder: every clone shares one call log, the page result,
     * the cursor lookup and a queue of counts, so the test can inspect the
     * ORDER BY and keyset predicates the helper builds on any clone.
     */
    function createRecordingBuilder(opts: {
      page: Row[];
      cursorEntity?: Row | null;
      counts?: number[];
    }) {
      const counts = [...(opts.counts ?? [0, 0])];
      const log: {
        orderBy: unknown[][];
        addOrderBy: unknown[][];
        predicates: { sql: string; parameters: Record<string, unknown> }[];
        take: unknown[];
      } = { orderBy: [], addOrderBy: [], predicates: [], take: [] };

      const recordWhere = (condition: unknown) => {
        if (condition instanceof Brackets) {
          condition.whereFactory({
            where: (sql: string, parameters: Record<string, unknown>) => {
              log.predicates.push({ sql, parameters });
              return undefined;
            },
          } as any);
        }
      };

      const make = (): any => {
        const qb: any = {
          alias: 'space',
          expressionMap: { orderBys: {}, wheres: [] },
          orderBy: vi.fn((...args: unknown[]) => {
            log.orderBy.push(args);
            return qb;
          }),
          addOrderBy: vi.fn((...args: unknown[]) => {
            log.addOrderBy.push(args);
            return qb;
          }),
          where: vi.fn((condition: unknown) => {
            recordWhere(condition);
            qb.expressionMap.wheres.push(condition);
            return qb;
          }),
          andWhere: vi.fn((condition: unknown) => {
            recordWhere(condition);
            qb.expressionMap.wheres.push(condition);
            return qb;
          }),
          take: vi.fn((n: unknown) => {
            log.take.push(n);
            return qb;
          }),
          clone: vi.fn(() => make()),
          getOne: vi.fn(async () => opts.cursorEntity ?? null),
          getMany: vi.fn(async () => [...opts.page]),
          getCount: vi.fn(async () => counts.shift() ?? 0),
        };
        return qb;
      };

      return { qb: make() as SelectQueryBuilder<Row>, log };
    }

    it('orders by the flag DESC first, then rowId in the requested direction', async () => {
      const { qb, log } = createRecordingBuilder({ page: [row(3, true)] });

      await getRelayStylePaginationResults(
        qb,
        { first: 2 } as PaginationArgs,
        'ASC',
        undefined,
        { leadingBooleanDesc: 'promote' }
      );

      expect(log.orderBy).toEqual([['space.promote', 'DESC']]);
      expect(log.addOrderBy).toEqual([['space.rowId', 'ASC']]);
      expect(log.take).toEqual([2]);
    });

    it('with `after`, continues from the cursor with the composite (flag, rowId) keyset', async () => {
      const cursor = row(5, true);
      const { qb, log } = createRecordingBuilder({
        page: [row(9, true), row(1, false)],
        cursorEntity: cursor,
      });

      await getRelayStylePaginationResults(
        qb,
        { first: 2, after: cursor.id } as PaginationArgs,
        'ASC',
        undefined,
        { leadingBooleanDesc: 'promote' }
      );

      const cursorPredicate = log.predicates.find(p =>
        p.sql.includes(':keysetFlag_cursor')
      );
      expect(cursorPredicate?.sql).toBe(
        '(space.promote < :keysetFlag_cursor OR (space.promote = :keysetFlag_cursor AND space.rowId > :keysetRowId_cursor))'
      );
      expect(cursorPredicate?.parameters).toEqual({
        keysetFlag_cursor: true,
        keysetRowId_cursor: 5,
      });
    });

    it('with sort DESC, the rowId half of the keyset is reversed', async () => {
      const cursor = row(5, false);
      const { qb, log } = createRecordingBuilder({
        page: [row(4, false)],
        cursorEntity: cursor,
      });

      await getRelayStylePaginationResults(
        qb,
        { first: 2, after: cursor.id } as PaginationArgs,
        'DESC',
        undefined,
        { leadingBooleanDesc: 'promote' }
      );

      expect(log.addOrderBy).toEqual([['space.rowId', 'DESC']]);
      expect(
        log.predicates.find(p => p.sql.includes(':keysetFlag_cursor'))?.sql
      ).toBe(
        '(space.promote < :keysetFlag_cursor OR (space.promote = :keysetFlag_cursor AND space.rowId < :keysetRowId_cursor))'
      );
    });

    it('with `last`/`before`, reads the preceding rows in reverse order and returns them in forward order', async () => {
      const cursor = row(2, false);
      // The DB returns the reverse order: nearest preceding row first.
      const { qb, log } = createRecordingBuilder({
        page: [row(1, false), row(9, true)],
        cursorEntity: cursor,
      });

      const result = await getRelayStylePaginationResults(
        qb,
        { last: 2, before: cursor.id } as PaginationArgs,
        'ASC',
        undefined,
        { leadingBooleanDesc: 'promote' }
      );

      expect(log.orderBy).toEqual([['space.promote', 'ASC']]);
      expect(log.addOrderBy).toEqual([['space.rowId', 'DESC']]);
      expect(
        log.predicates.find(p => p.sql.includes(':keysetFlag_cursor'))?.sql
      ).toBe(
        '(space.promote > :keysetFlag_cursor OR (space.promote = :keysetFlag_cursor AND space.rowId < :keysetRowId_cursor))'
      );
      expect(result.edges.map(e => e.node.rowId)).toEqual([9, 1]);
      expect(result.pageInfo.startCursor).toBe('id-9');
      expect(result.pageInfo.endCursor).toBe('id-1');
    });

    it('computes hasPreviousPage / hasNextPage with the keyset of the first / last row of the page', async () => {
      const { qb, log } = createRecordingBuilder({
        page: [row(7, true), row(2, false)],
        counts: [1, 0],
      });

      const result = await getRelayStylePaginationResults(
        qb,
        { first: 2 } as PaginationArgs,
        'ASC',
        undefined,
        { leadingBooleanDesc: 'promote' }
      );

      expect(log.predicates).toEqual([
        {
          sql: '(space.promote > :keysetFlag_start OR (space.promote = :keysetFlag_start AND space.rowId < :keysetRowId_start))',
          parameters: { keysetFlag_start: true, keysetRowId_start: 7 },
        },
        {
          sql: '(space.promote < :keysetFlag_end OR (space.promote = :keysetFlag_end AND space.rowId > :keysetRowId_end))',
          parameters: { keysetFlag_end: false, keysetRowId_end: 2 },
        },
      ]);
      expect(result.pageInfo.hasPreviousPage).toBe(true);
      expect(result.pageInfo.hasNextPage).toBe(false);
    });

    it('an empty page has no cursors and no further pages, without counting', async () => {
      const { qb, log } = createRecordingBuilder({ page: [] });

      const result = await getRelayStylePaginationResults(
        qb,
        {} as PaginationArgs,
        'ASC',
        undefined,
        { leadingBooleanDesc: 'promote' }
      );

      expect(log.take).toEqual([25]);
      expect(log.predicates).toEqual([]);
      expect(result.pageInfo).toEqual({
        startCursor: undefined,
        endCursor: undefined,
        hasNextPage: false,
        hasPreviousPage: false,
      });
    });

    it('throws EntityNotFoundException for an unknown cursor', async () => {
      const { qb } = createRecordingBuilder({ page: [], cursorEntity: null });

      await expect(
        getRelayStylePaginationResults(
          qb,
          { first: 2, after: 'missing' } as PaginationArgs,
          'ASC',
          undefined,
          { leadingBooleanDesc: 'promote' }
        )
      ).rejects.toThrow(EntityNotFoundException);
    });

    it('without the option, the existing single-key path is used unchanged', async () => {
      const { qb, log } = createRecordingBuilder({ page: [row(1, true)] });

      await getRelayStylePaginationResults(qb, { first: 2 } as PaginationArgs);

      expect(log.orderBy).toEqual([[{ 'space.rowId': 'ASC' }]]);
      expect(log.addOrderBy).toEqual([]);
      expect(log.predicates).toEqual([]);
    });
  });
});
