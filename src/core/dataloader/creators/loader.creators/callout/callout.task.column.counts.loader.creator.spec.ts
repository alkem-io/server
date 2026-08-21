import { Callout } from '@domain/collaboration/callout/callout.entity';
import { CalloutContribution } from '@domain/collaboration/callout-contribution/callout.contribution.entity';
import { Test, TestingModule } from '@nestjs/testing';
import { getEntityManagerToken } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { type Mocked, vi } from 'vitest';
import { CalloutTaskColumnCountsLoaderCreator } from './callout.task.column.counts.loader.creator';

type ColumnsRow = { calloutId: string; allowedValues: string | null };
type CountsRow = { calloutId: string; column: string; count: string };

/**
 * Routes each `getRepository(entity)` to its own query-builder double, so the
 * board-columns query (against Callout) and the counts query (against
 * CalloutContribution) can return different rows while sharing one entity
 * manager. Every builder method is chainable and terminates in `getRawMany`.
 */
function mockRepositories(
  entityManager: Mocked<EntityManager>,
  columnsRows: ColumnsRow[],
  countsRows: CountsRow[]
) {
  const makeQb = (rows: unknown[]) => ({
    innerJoin: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    addSelect: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    groupBy: vi.fn().mockReturnThis(),
    addGroupBy: vi.fn().mockReturnThis(),
    getRawMany: vi.fn().mockResolvedValue(rows),
  });

  const columnsQb = makeQb(columnsRows);
  const countsQb = makeQb(countsRows);

  entityManager.getRepository.mockImplementation((entity: any) => {
    if (entity === Callout) {
      return { createQueryBuilder: vi.fn().mockReturnValue(columnsQb) } as any;
    }
    if (entity === CalloutContribution) {
      return { createQueryBuilder: vi.fn().mockReturnValue(countsQb) } as any;
    }
    throw new Error('unexpected repository requested');
  });

  return { columnsQb, countsQb };
}

describe('CalloutTaskColumnCountsLoaderCreator', () => {
  let creator: CalloutTaskColumnCountsLoaderCreator;
  let entityManager: Mocked<EntityManager>;

  beforeEach(async () => {
    const mockEntityManager = {
      getRepository: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CalloutTaskColumnCountsLoaderCreator,
        {
          provide: getEntityManagerToken(),
          useValue: mockEntityManager,
        },
      ],
    }).compile();

    creator = module.get(CalloutTaskColumnCountsLoaderCreator);
    entityManager = module.get(
      getEntityManagerToken()
    ) as Mocked<EntityManager>;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('batches N callouts into one columns query and one counts query (no per-callout re-fetch)', async () => {
    mockRepositories(
      entityManager,
      [
        { calloutId: 'board-1', allowedValues: 'Backlog,Done' },
        { calloutId: 'board-2', allowedValues: 'To do' },
      ],
      [
        { calloutId: 'board-1', column: 'Backlog', count: '2' },
        { calloutId: 'board-1', column: 'Done', count: '3' },
        { calloutId: 'board-2', column: 'To do', count: '1' },
      ]
    );

    const loader = creator.create();
    const [b1, b2] = await Promise.all([
      loader.load('board-1'),
      loader.load('board-2'),
    ]);

    // Exactly one repository per batched query: no N+1 board-detection fetch.
    expect(entityManager.getRepository).toHaveBeenCalledWith(Callout);
    expect(entityManager.getRepository).toHaveBeenCalledWith(
      CalloutContribution
    );
    expect(entityManager.getRepository).toHaveBeenCalledTimes(2);

    expect(b1).toEqual([
      { column: 'Backlog', count: 2 },
      { column: 'Done', count: 3 },
    ]);
    expect(b2).toEqual([{ column: 'To do', count: 1 }]);
  });

  it('zero-fills columns that carry no tasks, in board-defined order', async () => {
    mockRepositories(
      entityManager,
      [{ calloutId: 'board-1', allowedValues: 'Backlog,To do,Done' }],
      [{ calloutId: 'board-1', column: 'Backlog', count: '4' }]
    );

    const loader = creator.create();
    const b1 = await loader.load('board-1');

    expect(b1).toEqual([
      { column: 'Backlog', count: 4 },
      { column: 'To do', count: 0 },
      { column: 'Done', count: 0 },
    ]);
  });

  it('returns null for a callout that is not a board (absent from the columns query)', async () => {
    mockRepositories(
      entityManager,
      [{ calloutId: 'board-1', allowedValues: 'Backlog' }],
      [{ calloutId: 'board-1', column: 'Backlog', count: '1' }]
    );

    const loader = creator.create();
    const [board, plain] = await Promise.all([
      loader.load('board-1'),
      loader.load('plain-callout'),
    ]);

    expect(board).toEqual([{ column: 'Backlog', count: 1 }]);
    expect(plain).toBeNull();
  });

  it('parses counts as integers', async () => {
    mockRepositories(
      entityManager,
      [{ calloutId: 'board-1', allowedValues: 'X' }],
      [{ calloutId: 'board-1', column: 'X', count: '20' }]
    );

    const loader = creator.create();
    const b1 = await loader.load('board-1');

    expect(b1?.[0]).toEqual({ column: 'X', count: 20 });
    expect(typeof b1?.[0].count).toBe('number');
  });
});
