import { CalloutContribution } from '@domain/collaboration/callout-contribution/callout.contribution.entity';
import { Test, TestingModule } from '@nestjs/testing';
import { getEntityManagerToken } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { type Mocked, vi } from 'vitest';
import { CalloutTaskColumnCountsLoaderCreator } from './callout.task.column.counts.loader.creator';

function mockQueryBuilder(
  entityManager: Mocked<EntityManager>,
  rawResult: { calloutId: string; column: string; count: string }[]
) {
  const qb = {
    innerJoin: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    addSelect: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    groupBy: vi.fn().mockReturnThis(),
    addGroupBy: vi.fn().mockReturnThis(),
    getRawMany: vi.fn().mockResolvedValue(rawResult),
  };
  const repo = { createQueryBuilder: vi.fn().mockReturnValue(qb) };
  entityManager.getRepository.mockReturnValue(repo as any);
  return qb;
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

  it('batches multiple boards into a single grouped query', async () => {
    mockQueryBuilder(entityManager, [
      { calloutId: 'board-1', column: 'Backlog', count: '2' },
      { calloutId: 'board-1', column: 'Done', count: '3' },
      { calloutId: 'board-2', column: 'To do', count: '1' },
    ]);

    const loader = creator.create();
    const [b1, b2] = await Promise.all([
      loader.load('board-1'),
      loader.load('board-2'),
    ]);

    expect(entityManager.getRepository).toHaveBeenCalledTimes(1);
    expect(entityManager.getRepository).toHaveBeenCalledWith(
      CalloutContribution
    );
    expect(b1.get('Backlog')).toBe(2);
    expect(b1.get('Done')).toBe(3);
    expect(b2.get('To do')).toBe(1);
  });

  it('returns an empty map for a board with no tasks', async () => {
    mockQueryBuilder(entityManager, [
      { calloutId: 'board-1', column: 'Backlog', count: '4' },
    ]);

    const loader = creator.create();
    const [b1, b2] = await Promise.all([
      loader.load('board-1'),
      loader.load('board-empty'),
    ]);

    expect(b1.get('Backlog')).toBe(4);
    expect(b2.size).toBe(0);
  });

  it('parses counts as integers and returns per-callout maps in input order', async () => {
    mockQueryBuilder(entityManager, [
      { calloutId: 'board-2', column: 'X', count: '20' },
      { calloutId: 'board-1', column: 'X', count: '10' },
    ]);

    const loader = creator.create();
    const [b1, b2] = await Promise.all([
      loader.load('board-1'),
      loader.load('board-2'),
    ]);

    expect(b1.get('X')).toBe(10);
    expect(b2.get('X')).toBe(20);
    expect(typeof b1.get('X')).toBe('number');
  });
});
