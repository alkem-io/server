import {
  EntityNotFoundException,
  PaginationInputOutOfBoundException,
  PaginationParameterNotFoundException,
} from '@src/common/exceptions';
import { IBaseAlkemio } from '@src/domain/common/entity/base-entity';
import { type SelectQueryBuilder } from 'typeorm';
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
});
