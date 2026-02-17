import { CalloutContribution } from '@domain/collaboration/callout-contribution/callout.contribution.entity';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { vi } from 'vitest';
import { CalloutContributionService } from './callout.contribution.service';

function createMockQueryBuilder(
  rawResult: { calloutId: string; count: string }[] = []
) {
  return {
    select: vi.fn().mockReturnThis(),
    addSelect: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    groupBy: vi.fn().mockReturnThis(),
    getRawMany: vi.fn().mockResolvedValue(rawResult),
  };
}

describe('CalloutContributionService', () => {
  let service: CalloutContributionService;
  let mockRepository: any;

  beforeEach(async () => {
    mockRepository = {
      findOne: vi.fn(),
      find: vi.fn(),
      save: vi.fn(),
      remove: vi.fn(),
      count: vi.fn(),
      createQueryBuilder: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CalloutContributionService,
        {
          provide: getRepositoryToken(CalloutContribution),
          useValue: mockRepository,
        },
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get<CalloutContributionService>(
      CalloutContributionService
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getContributionsCountBatch', () => {
    it('should return an empty map for empty calloutIds', async () => {
      const result = await service.getContributionsCountBatch([]);

      expect(result).toBeInstanceOf(Map);
      expect(result.size).toBe(0);
      expect(mockRepository.createQueryBuilder).not.toHaveBeenCalled();
    });

    it('should batch count contributions in a single grouped query', async () => {
      const qb = createMockQueryBuilder([
        { calloutId: 'callout-1', count: '5' },
        { calloutId: 'callout-2', count: '12' },
      ]);
      mockRepository.createQueryBuilder.mockReturnValue(qb);

      const result = await service.getContributionsCountBatch([
        'callout-1',
        'callout-2',
      ]);

      expect(mockRepository.createQueryBuilder).toHaveBeenCalledTimes(1);
      expect(mockRepository.createQueryBuilder).toHaveBeenCalledWith(
        'contribution'
      );
      expect(result.get('callout-1')).toBe(5);
      expect(result.get('callout-2')).toBe(12);
    });

    it('should pass callout IDs in the IN clause', async () => {
      const qb = createMockQueryBuilder([]);
      mockRepository.createQueryBuilder.mockReturnValue(qb);

      await service.getContributionsCountBatch([
        'callout-a',
        'callout-b',
        'callout-c',
      ]);

      expect(qb.where).toHaveBeenCalledWith(
        'contribution.calloutId IN (:...calloutIds)',
        { calloutIds: ['callout-a', 'callout-b', 'callout-c'] }
      );
    });

    it('should return 0 for callouts with no contributions (not in map)', async () => {
      const qb = createMockQueryBuilder([
        { calloutId: 'callout-1', count: '3' },
      ]);
      mockRepository.createQueryBuilder.mockReturnValue(qb);

      const result = await service.getContributionsCountBatch([
        'callout-1',
        'callout-2',
      ]);

      expect(result.get('callout-1')).toBe(3);
      expect(result.has('callout-2')).toBe(false); // caller uses ?? 0
    });

    it('should parse count strings as integers', async () => {
      const qb = createMockQueryBuilder([
        { calloutId: 'callout-1', count: '4567' },
      ]);
      mockRepository.createQueryBuilder.mockReturnValue(qb);

      const result = await service.getContributionsCountBatch(['callout-1']);
      const count = result.get('callout-1');

      expect(count).toBe(4567);
      expect(typeof count).toBe('number');
    });

    it('should handle a single callout ID', async () => {
      const qb = createMockQueryBuilder([
        { calloutId: 'only-one', count: '1' },
      ]);
      mockRepository.createQueryBuilder.mockReturnValue(qb);

      const result = await service.getContributionsCountBatch(['only-one']);

      expect(result.get('only-one')).toBe(1);
    });

    it('should propagate database errors', async () => {
      const qb = createMockQueryBuilder();
      qb.getRawMany.mockRejectedValue(new Error('DB error'));
      mockRepository.createQueryBuilder.mockReturnValue(qb);

      await expect(
        service.getContributionsCountBatch(['callout-1'])
      ).rejects.toThrow('DB error');
    });

    it('should handle large batch of callout IDs', async () => {
      const calloutIds = Array.from({ length: 100 }, (_, i) => `callout-${i}`);
      const rawResult = calloutIds.map(id => ({
        calloutId: id,
        count: '1',
      }));
      const qb = createMockQueryBuilder(rawResult);
      mockRepository.createQueryBuilder.mockReturnValue(qb);

      const result = await service.getContributionsCountBatch(calloutIds);

      expect(result.size).toBe(100);
      for (const id of calloutIds) {
        expect(result.get(id)).toBe(1);
      }
    });
  });
});
