import {
  EntityNotInitializedException,
  ValidationException,
} from '@common/exceptions';
import { RoleSetService } from '@domain/access/role-set/role.set.service';
import { SpaceService } from '@domain/space/space/space.service';
import { Test, TestingModule } from '@nestjs/testing';
import { NamingService } from '@services/infrastructure/naming/naming.service';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mock, vi } from 'vitest';
import { ConversionService } from './conversion.service';

describe('ConversionService', () => {
  let service: ConversionService;
  let spaceService: Record<string, Mock>;
  let _roleSetService: Record<string, Mock>;
  let _namingService: Record<string, Mock>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ConversionService, MockWinstonProvider],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(ConversionService);
    spaceService = module.get(SpaceService) as unknown as Record<string, Mock>;
    _roleSetService = module.get(RoleSetService) as unknown as Record<
      string,
      Mock
    >;
    _namingService = module.get(NamingService) as unknown as Record<
      string,
      Mock
    >;
  });

  describe('convertSpaceL1ToSpaceL0OrFail', () => {
    it('should throw EntityNotInitializedException when L1 space is missing community', async () => {
      vi.mocked(spaceService.getSpaceOrFail).mockResolvedValue({
        id: 'space-l1',
        community: undefined,
        collaboration: { innovationFlow: { states: [] } },
        storageAggregator: {},
        subspaces: [],
        agent: {},
      });

      await expect(
        service.convertSpaceL1ToSpaceL0OrFail({ spaceL1ID: 'space-l1' })
      ).rejects.toThrow(EntityNotInitializedException);
    });

    it('should throw EntityNotInitializedException when L1 space is missing collaboration', async () => {
      vi.mocked(spaceService.getSpaceOrFail).mockResolvedValue({
        id: 'space-l1',
        community: { roleSet: {} },
        collaboration: undefined,
        storageAggregator: {},
        subspaces: [],
        agent: {},
      });

      await expect(
        service.convertSpaceL1ToSpaceL0OrFail({ spaceL1ID: 'space-l1' })
      ).rejects.toThrow(EntityNotInitializedException);
    });

    it('should throw EntityNotInitializedException when L1 space is missing agent', async () => {
      vi.mocked(spaceService.getSpaceOrFail).mockResolvedValue({
        id: 'space-l1',
        community: { roleSet: {} },
        collaboration: { innovationFlow: { states: [] } },
        storageAggregator: {},
        subspaces: [],
        agent: undefined,
      });

      await expect(
        service.convertSpaceL1ToSpaceL0OrFail({ spaceL1ID: 'space-l1' })
      ).rejects.toThrow(EntityNotInitializedException);
    });

    it('should throw EntityNotInitializedException when L0 space is missing account', async () => {
      const spaceL1 = {
        id: 'space-l1',
        levelZeroSpaceID: 'space-l0',
        community: { roleSet: {} },
        collaboration: { innovationFlow: { states: [] } },
        storageAggregator: {},
        subspaces: [],
        agent: {},
      };
      const spaceL0 = {
        id: 'space-l0',
        account: undefined,
        subspaces: [],
      };
      vi.mocked(spaceService.getSpaceOrFail)
        .mockResolvedValueOnce(spaceL1)
        .mockResolvedValueOnce(spaceL0);

      await expect(
        service.convertSpaceL1ToSpaceL0OrFail({ spaceL1ID: 'space-l1' })
      ).rejects.toThrow(EntityNotInitializedException);
    });
  });

  describe('convertSpaceL1ToSpaceL2OrFail', () => {
    it('should throw EntityNotInitializedException when L1 space is missing community', async () => {
      vi.mocked(spaceService.getSpaceOrFail).mockResolvedValue({
        id: 'space-l1',
        community: undefined,
        storageAggregator: {},
      });

      await expect(
        service.convertSpaceL1ToSpaceL2OrFail({
          spaceL1ID: 'space-l1',
          parentSpaceL1ID: 'parent-l1',
        })
      ).rejects.toThrow(EntityNotInitializedException);
    });

    it('should throw ValidationException when L1 and parent L1 have different levelZeroSpaceIDs', async () => {
      const spaceL1 = {
        id: 'space-l1',
        levelZeroSpaceID: 'l0-a',
        community: { roleSet: {} },
        storageAggregator: {},
      };
      const parentL1 = {
        id: 'parent-l1',
        levelZeroSpaceID: 'l0-b',
        storageAggregator: {},
        community: { roleSet: {} },
      };
      vi.mocked(spaceService.getSpaceOrFail)
        .mockResolvedValueOnce(spaceL1)
        .mockResolvedValueOnce(parentL1);

      await expect(
        service.convertSpaceL1ToSpaceL2OrFail({
          spaceL1ID: 'space-l1',
          parentSpaceL1ID: 'parent-l1',
        })
      ).rejects.toThrow(ValidationException);
    });

    it('should throw EntityNotInitializedException when parent L1 space is missing storageAggregator', async () => {
      const spaceL1 = {
        id: 'space-l1',
        levelZeroSpaceID: 'l0-a',
        community: { roleSet: {} },
        storageAggregator: {},
      };
      const parentL1 = {
        id: 'parent-l1',
        levelZeroSpaceID: 'l0-a',
        storageAggregator: undefined,
        community: { roleSet: {} },
      };
      vi.mocked(spaceService.getSpaceOrFail)
        .mockResolvedValueOnce(spaceL1)
        .mockResolvedValueOnce(parentL1);

      await expect(
        service.convertSpaceL1ToSpaceL2OrFail({
          spaceL1ID: 'space-l1',
          parentSpaceL1ID: 'parent-l1',
        })
      ).rejects.toThrow(EntityNotInitializedException);
    });
  });

  describe('convertSpaceL2ToSpaceL1OrFail', () => {
    it('should throw EntityNotInitializedException when L2 space community is missing', async () => {
      vi.mocked(spaceService.getSpaceOrFail).mockResolvedValue({
        id: 'space-l2',
        community: undefined,
      });

      await expect(
        service.convertSpaceL2ToSpaceL1OrFail({ spaceL2ID: 'space-l2' })
      ).rejects.toThrow(EntityNotInitializedException);
    });

    it('should throw EntityNotInitializedException when L0 space is missing storageAggregator', async () => {
      const spaceL2 = {
        id: 'space-l2',
        levelZeroSpaceID: 'space-l0',
        community: { roleSet: {} },
      };
      const spaceL0 = {
        id: 'space-l0',
        storageAggregator: undefined,
        community: { roleSet: {} },
      };
      vi.mocked(spaceService.getSpaceOrFail)
        .mockResolvedValueOnce(spaceL2)
        .mockResolvedValueOnce(spaceL0);

      await expect(
        service.convertSpaceL2ToSpaceL1OrFail({ spaceL2ID: 'space-l2' })
      ).rejects.toThrow(EntityNotInitializedException);
    });
  });
});
