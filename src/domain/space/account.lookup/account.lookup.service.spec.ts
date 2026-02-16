import { Organization } from '@domain/community/organization';
import { User } from '@domain/community/user/user.entity';
import { Test, TestingModule } from '@nestjs/testing';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { vi } from 'vitest';
import { EntityManager } from 'typeorm';
import { getEntityManagerToken } from '@nestjs/typeorm';
import { Account } from '../account/account.entity';
import { IAccount } from '../account/account.interface';
import { AccountLookupService } from './account.lookup.service';

describe('AccountLookupService', () => {
  let service: AccountLookupService;
  let entityManager: EntityManager;

  beforeEach(async () => {
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
        relations: { agent: true },
      };

      await service.getAccountOrFail('account-1', options as any);

      expect(findOneSpy).toHaveBeenCalledWith(Account, {
        relations: { agent: true },
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

  describe('getAgent', () => {
    it('should return agent when account and agent exist', async () => {
      const mockAgent = { id: 'agent-1' };
      const mockAccount = { id: 'account-1', agent: mockAgent } as IAccount;
      vi.spyOn(entityManager, 'findOne').mockResolvedValue(mockAccount);

      const result = await service.getAgent('account-1');

      expect(result).toBe(mockAgent);
    });

    it('should throw RelationshipNotFoundException when agent is not loaded', async () => {
      const mockAccount = { id: 'account-1', agent: undefined } as IAccount;
      vi.spyOn(entityManager, 'findOne').mockResolvedValue(mockAccount);

      await expect(service.getAgent('account-1')).rejects.toThrow(
        'Unable to retrieve Agent for Account: account-1'
      );
    });

    it('should throw EntityNotFoundException when account not found', async () => {
      vi.spyOn(entityManager, 'findOne').mockResolvedValue(null);

      await expect(service.getAgent('missing-id')).rejects.toThrow(
        'Unable to find Account on Host with ID: missing-id'
      );
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
});
