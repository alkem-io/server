import { Organization } from '@domain/community/organization';
import { User } from '@domain/community/user/user.entity';
import { Test, TestingModule } from '@nestjs/testing';
import { getEntityManagerToken } from '@nestjs/typeorm';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { EntityManager } from 'typeorm';
import { vi } from 'vitest';
import { Account } from '../account/account.entity';
import { IAccount } from '../account/account.interface';
import { AccountLookupService } from './account.lookup.service';

describe('AccountLookupService', () => {
  let service: AccountLookupService;
  let entityManager: EntityManager;

  beforeEach(async () => {
    vi.restoreAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccountLookupService,
        MockWinstonProvider,
        {
          provide: getEntityManagerToken('default'),
          useValue: {
            findOne: vi.fn(),
          },
        },
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(AccountLookupService);
    entityManager = module.get(getEntityManagerToken('default'));
  });

  describe('getAccountOrFail', () => {
    it('should return account when found', async () => {
      const mockAccount = { id: 'account-1' } as IAccount;
      vi.spyOn(entityManager, 'findOne').mockResolvedValue(mockAccount);

      const result = await service.getAccountOrFail('account-1');

      expect(result).toBe(mockAccount);
    });

    it('should throw EntityNotFoundException when account not found', async () => {
      vi.spyOn(entityManager, 'findOne').mockResolvedValue(null);

      await expect(service.getAccountOrFail('missing-id')).rejects.toThrow(
        'Unable to find Account on Host with ID: missing-id'
      );
    });

    it('should pass options through to entityManager.findOne', async () => {
      const mockAccount = { id: 'account-1' } as IAccount;
      const findOneSpy = vi
        .spyOn(entityManager, 'findOne')
        .mockResolvedValue(mockAccount);
      const options = {
        relations: { credentials: true },
      };

      await service.getAccountOrFail('account-1', options as any);

      expect(findOneSpy).toHaveBeenCalledWith(Account, {
        relations: { credentials: true },
        where: { id: 'account-1' },
      });
    });
  });

  describe('getAccount', () => {
    it('should return null when account not found', async () => {
      vi.spyOn(entityManager, 'findOne').mockResolvedValue(null);

      const result = await service.getAccount('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('getHostOrFail', () => {
    it('should throw EntityNotFoundException when no host found', async () => {
      const mockAccount = { id: 'account-1' } as IAccount;
      vi.spyOn(entityManager, 'findOne')
        .mockResolvedValueOnce(null) // User lookup
        .mockResolvedValueOnce(null); // Organization lookup

      await expect(service.getHostOrFail(mockAccount)).rejects.toThrow(
        'Unable to find Host for account with ID: account-1'
      );
    });
  });

  describe('getHost', () => {
    it('should return user when user exists for account', async () => {
      const mockUser = { id: 'user-1', accountID: 'account-1' };
      const mockAccount = { id: 'account-1' } as IAccount;
      vi.spyOn(entityManager, 'findOne').mockResolvedValueOnce(mockUser);

      const result = await service.getHost(mockAccount);

      expect(result).toBe(mockUser);
      expect(entityManager.findOne).toHaveBeenCalledWith(User, {
        where: { accountID: 'account-1' },
      });
    });

    it('should return organization when no user but organization exists', async () => {
      const mockOrg = { id: 'org-1', accountID: 'account-1' };
      const mockAccount = { id: 'account-1' } as IAccount;
      vi.spyOn(entityManager, 'findOne')
        .mockResolvedValueOnce(null) // User lookup returns null
        .mockResolvedValueOnce(mockOrg); // Organization lookup

      const result = await service.getHost(mockAccount);

      expect(result).toBe(mockOrg);
      expect(entityManager.findOne).toHaveBeenCalledWith(Organization, {
        where: { accountID: 'account-1' },
      });
    });

    it('should return null and log warning when neither user nor organization found', async () => {
      const mockAccount = { id: 'account-1' } as IAccount;
      vi.spyOn(entityManager, 'findOne')
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);

      const result = await service.getHost(mockAccount);

      expect(result).toBeNull();
    });

    it('should prefer user over organization when both exist', async () => {
      const mockUser = { id: 'user-1', accountID: 'account-1' };
      const mockAccount = { id: 'account-1' } as IAccount;
      vi.spyOn(entityManager, 'findOne').mockResolvedValueOnce(mockUser);

      const result = await service.getHost(mockAccount);

      expect(result).toBe(mockUser);
      // getHost checks user first; when found, it returns immediately without checking organization
      expect(entityManager.findOne).toHaveBeenCalledTimes(1);
    });
  });

  describe('areResourcesInAccount', () => {
    it('should return true when account has spaces', async () => {
      const mockAccount = {
        id: 'account-1',
        spaces: [{ id: 'space-1' }],
        virtualContributors: [],
        innovationPacks: [],
        innovationHubs: [],
      } as unknown as IAccount;
      vi.spyOn(entityManager, 'findOne').mockResolvedValue(mockAccount);

      const result = await service.areResourcesInAccount('account-1');

      expect(result).toBe(true);
    });

    it('should return true when account has virtual contributors', async () => {
      const mockAccount = {
        id: 'account-1',
        spaces: [],
        virtualContributors: [{ id: 'vc-1' }],
        innovationPacks: [],
        innovationHubs: [],
      } as unknown as IAccount;
      vi.spyOn(entityManager, 'findOne').mockResolvedValue(mockAccount);

      const result = await service.areResourcesInAccount('account-1');

      expect(result).toBe(true);
    });

    it('should return true when account has innovation packs', async () => {
      const mockAccount = {
        id: 'account-1',
        spaces: [],
        virtualContributors: [],
        innovationPacks: [{ id: 'ip-1' }],
        innovationHubs: [],
      } as unknown as IAccount;
      vi.spyOn(entityManager, 'findOne').mockResolvedValue(mockAccount);

      const result = await service.areResourcesInAccount('account-1');

      expect(result).toBe(true);
    });

    it('should return true when account has innovation hubs', async () => {
      const mockAccount = {
        id: 'account-1',
        spaces: [],
        virtualContributors: [],
        innovationPacks: [],
        innovationHubs: [{ id: 'hub-1' }],
      } as unknown as IAccount;
      vi.spyOn(entityManager, 'findOne').mockResolvedValue(mockAccount);

      const result = await service.areResourcesInAccount('account-1');

      expect(result).toBe(true);
    });

    it('should return false when account has no resources', async () => {
      const mockAccount = {
        id: 'account-1',
        spaces: [],
        virtualContributors: [],
        innovationPacks: [],
        innovationHubs: [],
      } as unknown as IAccount;
      vi.spyOn(entityManager, 'findOne').mockResolvedValue(mockAccount);

      const result = await service.areResourcesInAccount('account-1');

      expect(result).toBe(false);
    });
  });

  describe('getAccountResourceBlockers', () => {
    it('itemizes every resource kind with its display name', async () => {
      const mockAccount = {
        id: 'account-1',
        spaces: [
          {
            id: 'space-1',
            nameID: 'space-one',
            profile: { displayName: 'Space One' },
          },
        ],
        virtualContributors: [
          { id: 'vc-1', nameID: 'vc-one', profile: { displayName: 'VC One' } },
        ],
        innovationPacks: [],
        innovationHubs: [],
      } as unknown as IAccount;
      vi.spyOn(entityManager, 'findOne').mockResolvedValue(mockAccount);

      const result = await service.getAccountResourceBlockers('account-1', {
        cap: 25,
      });

      expect(result.truncated).toBe(false);
      expect(result.blockers).toEqual([
        {
          kind: 'ACCOUNT_SPACE',
          resourceID: 'space-1',
          displayName: 'Space One',
        },
        {
          kind: 'ACCOUNT_VIRTUAL_CONTRIBUTOR',
          resourceID: 'vc-1',
          displayName: 'VC One',
        },
      ]);
      expect(result.totals).toEqual([
        { kind: 'ACCOUNT_SPACE', total: 1 },
        { kind: 'ACCOUNT_VIRTUAL_CONTRIBUTOR', total: 1 },
        { kind: 'ACCOUNT_INNOVATION_PACK', total: 0 },
        { kind: 'ACCOUNT_INNOVATION_HUB', total: 0 },
      ]);
    });

    it('caps the blocker list but keeps totals accurate and flags truncation', async () => {
      const manySpaces = Array.from({ length: 30 }, (_, i) => ({
        id: `space-${i}`,
        nameID: `space-${i}`,
        profile: { displayName: `Space ${i}` },
      }));
      const mockAccount = {
        id: 'account-1',
        spaces: manySpaces,
        virtualContributors: [],
        innovationPacks: [],
        innovationHubs: [],
      } as unknown as IAccount;
      vi.spyOn(entityManager, 'findOne').mockResolvedValue(mockAccount);

      const result = await service.getAccountResourceBlockers('account-1', {
        cap: 25,
      });

      expect(result.truncated).toBe(true);
      expect(result.blockers).toHaveLength(25);
      expect(result.totals).toEqual(
        expect.arrayContaining([{ kind: 'ACCOUNT_SPACE', total: 30 }])
      );
    });

    it('falls back to nameID when the profile is not loaded', async () => {
      const mockAccount = {
        id: 'account-1',
        spaces: [{ id: 'space-1', nameID: 'space-one' }],
        virtualContributors: [],
        innovationPacks: [],
        innovationHubs: [],
      } as unknown as IAccount;
      vi.spyOn(entityManager, 'findOne').mockResolvedValue(mockAccount);

      const result = await service.getAccountResourceBlockers('account-1', {
        cap: 25,
      });

      expect(result.blockers[0].displayName).toBe('space-one');
    });
  });
});
