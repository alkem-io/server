import { Credential } from '@domain/agent/credential/credential.entity';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { vi } from 'vitest';
import { CredentialService } from './credential.service';

/**
 * Helper to create a mock query builder chain for the credential repository.
 * Returns the mock qb so individual tests can override specific method behaviors.
 */
function createMockQueryBuilder(
  rawResult: { resourceID: string; count: string }[] = []
) {
  return {
    select: vi.fn().mockReturnThis(),
    addSelect: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    andWhere: vi.fn().mockReturnThis(),
    groupBy: vi.fn().mockReturnThis(),
    getRawMany: vi.fn().mockResolvedValue(rawResult),
    leftJoinAndSelect: vi.fn().mockReturnThis(),
    getMany: vi.fn().mockResolvedValue([]),
    getCount: vi.fn().mockResolvedValue(0),
  };
}

describe('CredentialService', () => {
  let service: CredentialService;
  let mockRepository: any;

  beforeEach(async () => {
    mockRepository = {
      findOneBy: vi.fn(),
      save: vi.fn(),
      remove: vi.fn(),
      createQueryBuilder: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CredentialService,
        {
          provide: getRepositoryToken(Credential),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<CredentialService>(CredentialService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('countMatchingCredentialsBatch', () => {
    it('should return an empty map for empty criteria list', async () => {
      const result = await service.countMatchingCredentialsBatch([]);

      expect(result).toBeInstanceOf(Map);
      expect(result.size).toBe(0);
      expect(mockRepository.createQueryBuilder).not.toHaveBeenCalled();
    });

    it('should return an empty map when all criteria have undefined resourceID', async () => {
      const result = await service.countMatchingCredentialsBatch([
        { type: 'space-member' },
        { type: 'space-member', resourceID: undefined },
      ]);

      expect(result.size).toBe(0);
      expect(mockRepository.createQueryBuilder).not.toHaveBeenCalled();
    });

    it('should batch count credentials in a single grouped query', async () => {
      const qb = createMockQueryBuilder([
        { resourceID: 'res-1', count: '10' },
        { resourceID: 'res-2', count: '20' },
      ]);
      mockRepository.createQueryBuilder.mockReturnValue(qb);

      const result = await service.countMatchingCredentialsBatch([
        { type: 'space-member', resourceID: 'res-1' },
        { type: 'space-member', resourceID: 'res-2' },
      ]);

      expect(mockRepository.createQueryBuilder).toHaveBeenCalledTimes(1);
      expect(mockRepository.createQueryBuilder).toHaveBeenCalledWith(
        'credential'
      );
      expect(result.get('res-1')).toBe(10);
      expect(result.get('res-2')).toBe(20);
    });

    it('should use the type from the first criteria item', async () => {
      const qb = createMockQueryBuilder([]);
      mockRepository.createQueryBuilder.mockReturnValue(qb);

      await service.countMatchingCredentialsBatch([
        { type: 'space-member', resourceID: 'res-1' },
        { type: 'space-member', resourceID: 'res-2' },
      ]);

      expect(qb.where).toHaveBeenCalledWith('credential.type = :type', {
        type: 'space-member',
      });
    });

    it('should pass all resourceIDs in the IN clause', async () => {
      const qb = createMockQueryBuilder([]);
      mockRepository.createQueryBuilder.mockReturnValue(qb);

      await service.countMatchingCredentialsBatch([
        { type: 'space-member', resourceID: 'res-a' },
        { type: 'space-member', resourceID: 'res-b' },
        { type: 'space-member', resourceID: 'res-c' },
      ]);

      expect(qb.andWhere).toHaveBeenCalledWith(
        'credential.resourceID IN (:...resourceIDs)',
        { resourceIDs: ['res-a', 'res-b', 'res-c'] }
      );
    });

    it('should parse count strings from DB as integers', async () => {
      const qb = createMockQueryBuilder([
        { resourceID: 'res-1', count: '9999' },
      ]);
      mockRepository.createQueryBuilder.mockReturnValue(qb);

      const result = await service.countMatchingCredentialsBatch([
        { type: 'space-member', resourceID: 'res-1' },
      ]);

      const count = result.get('res-1');
      expect(count).toBe(9999);
      expect(typeof count).toBe('number');
    });

    it('should not include resourceIDs for criteria without resourceID', async () => {
      const qb = createMockQueryBuilder([
        { resourceID: 'res-1', count: '5' },
      ]);
      mockRepository.createQueryBuilder.mockReturnValue(qb);

      const result = await service.countMatchingCredentialsBatch([
        { type: 'space-member', resourceID: 'res-1' },
        { type: 'space-member' }, // no resourceID
      ]);

      expect(qb.andWhere).toHaveBeenCalledWith(
        'credential.resourceID IN (:...resourceIDs)',
        { resourceIDs: ['res-1'] }
      );
      expect(result.get('res-1')).toBe(5);
    });

    it('should return 0 for resourceIDs with no matching credentials', async () => {
      const qb = createMockQueryBuilder([
        { resourceID: 'res-1', count: '3' },
        // res-2 has no results
      ]);
      mockRepository.createQueryBuilder.mockReturnValue(qb);

      const result = await service.countMatchingCredentialsBatch([
        { type: 'space-member', resourceID: 'res-1' },
        { type: 'space-member', resourceID: 'res-2' },
      ]);

      expect(result.get('res-1')).toBe(3);
      expect(result.has('res-2')).toBe(false); // not in map → caller uses ?? 0
    });

    it('should propagate database errors', async () => {
      const qb = createMockQueryBuilder();
      qb.getRawMany.mockRejectedValue(new Error('query timeout'));
      mockRepository.createQueryBuilder.mockReturnValue(qb);

      await expect(
        service.countMatchingCredentialsBatch([
          { type: 'space-member', resourceID: 'res-1' },
        ])
      ).rejects.toThrow('query timeout');
    });

    it('should filter out empty string resourceIDs', async () => {
      const result = await service.countMatchingCredentialsBatch([
        { type: 'space-member', resourceID: '' },
      ]);

      // Empty string is falsy → filtered out → returns empty map
      expect(result.size).toBe(0);
      expect(mockRepository.createQueryBuilder).not.toHaveBeenCalled();
    });
  });
});
