import { AccountLookupService } from '@domain/space/account.lookup/account.lookup.service';
import { Space } from '@domain/space/space/space.entity';
import { ISpace } from '@domain/space/space/space.interface';
import { IContributor } from '@domain/community/contributor/contributor.interface';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { repositoryProviderMockFactory } from '@test/utils/repository.provider.mock.factory';
import { type Mocked } from 'vitest';
import { Repository } from 'typeorm';
import { SpaceLookupService } from './space.lookup.service';

function makeSpace(
  id: string,
  levelZeroSpaceID: string,
  account?: { id: string }
): ISpace {
  return { id, levelZeroSpaceID, account } as unknown as ISpace;
}

describe('SpaceLookupService', () => {
  let service: SpaceLookupService;
  let spaceRepository: Mocked<Repository<Space>>;
  let accountLookupService: Mocked<AccountLookupService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SpaceLookupService,
        repositoryProviderMockFactory(Space),
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get<SpaceLookupService>(SpaceLookupService);
    spaceRepository = module.get(
      getRepositoryToken(Space)
    ) as Mocked<Repository<Space>>;
    accountLookupService = module.get<AccountLookupService>(
      AccountLookupService
    ) as Mocked<AccountLookupService>;
  });

  describe('getProviderForSpace', () => {
    it('should skip DB query for L0 space with account already loaded', async () => {
      const space = makeSpace('space-1', 'space-1', { id: 'acc-1' });
      const mockHost = { id: 'user-1' } as IContributor;
      accountLookupService.getHost.mockResolvedValue(mockHost);

      const result = await service.getProviderForSpace(space);

      expect(result).toBe(mockHost);
      expect(spaceRepository.findOne).not.toHaveBeenCalled();
      expect(accountLookupService.getHost).toHaveBeenCalledWith(space.account);
    });

    it('should load from DB for L0 space without account', async () => {
      const space = makeSpace('space-1', 'space-1');
      const dbSpace = makeSpace('space-1', 'space-1', { id: 'acc-1' });
      spaceRepository.findOne.mockResolvedValue(dbSpace as unknown as Space);
      const mockHost = { id: 'user-1' } as IContributor;
      accountLookupService.getHost.mockResolvedValue(mockHost);

      const result = await service.getProviderForSpace(space);

      expect(result).toBe(mockHost);
      expect(spaceRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'space-1' },
        relations: { account: true },
      });
    });

    it('should load L0 space for non-L0 space', async () => {
      const space = makeSpace('subspace-1', 'root-space');
      const l0Space = makeSpace('root-space', 'root-space', { id: 'acc-1' });
      spaceRepository.findOne.mockResolvedValue(l0Space as unknown as Space);
      const mockHost = { id: 'org-1' } as IContributor;
      accountLookupService.getHost.mockResolvedValue(mockHost);

      const result = await service.getProviderForSpace(space);

      expect(result).toBe(mockHost);
      expect(spaceRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'root-space' },
        relations: { account: true },
      });
    });

    it('should return null and log warning when L0 space not found in DB', async () => {
      const space = makeSpace('space-1', 'space-1');
      spaceRepository.findOne.mockResolvedValue(null);

      const result = await service.getProviderForSpace(space);

      expect(result).toBeNull();
      expect(accountLookupService.getHost).not.toHaveBeenCalled();
    });

    it('should return null and log warning when L0 space has no account', async () => {
      const space = makeSpace('space-1', 'space-1');
      const dbSpace = makeSpace('space-1', 'space-1');
      spaceRepository.findOne.mockResolvedValue(dbSpace as unknown as Space);

      const result = await service.getProviderForSpace(space);

      expect(result).toBeNull();
      expect(accountLookupService.getHost).not.toHaveBeenCalled();
    });

    it('should return getHost result for full happy path', async () => {
      const space = makeSpace('sub-1', 'l0-space');
      const l0Space = makeSpace('l0-space', 'l0-space', { id: 'acc-42' });
      spaceRepository.findOne.mockResolvedValue(l0Space as unknown as Space);
      const expectedHost = { id: 'user-42' } as IContributor;
      accountLookupService.getHost.mockResolvedValue(expectedHost);

      const result = await service.getProviderForSpace(space);

      expect(result).toBe(expectedHost);
      expect(accountLookupService.getHost).toHaveBeenCalledWith(
        l0Space.account
      );
    });
  });
});
