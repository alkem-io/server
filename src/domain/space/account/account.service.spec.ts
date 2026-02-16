import { LicensingCredentialBasedCredentialType } from '@common/enums/licensing.credential.based.credential.type';
import { DRIZZLE } from '@config/drizzle/drizzle.constants';
import { AgentService } from '@domain/agent/agent/agent.service';
import { LicenseService } from '@domain/common/license/license.service';
import { VirtualContributorService } from '@domain/community/virtual-contributor/virtual.contributor.service';
import { InnovationHubService } from '@domain/innovation-hub/innovation.hub.service';
import { StorageAggregatorService } from '@domain/storage/storage-aggregator/storage.aggregator.service';
import { InnovationPackService } from '@library/innovation-pack/innovation.pack.service';
import { Test, TestingModule } from '@nestjs/testing';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { vi } from 'vitest';
import { SpaceService } from '../space/space.service';
import { Account } from './account.entity';
import { IAccount } from './account.interface';
import { AccountService } from './account.service';
import { mockDrizzleProvider } from '@test/utils/drizzle.mock.factory';

describe('AccountService', () => {
  let service: AccountService;
  let db: any;
  let agentService: AgentService;
  let storageAggregatorService: StorageAggregatorService;
  let spaceService: SpaceService;
  let virtualContributorService: VirtualContributorService;
  let innovationPackService: InnovationPackService;
  let innovationHubService: InnovationHubService;
  let licenseService: LicenseService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccountService,
        mockDrizzleProvider,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(AccountService);
    db = module.get(DRIZZLE);
    agentService = module.get(AgentService);
    storageAggregatorService = module.get(StorageAggregatorService);
    spaceService = module.get(SpaceService);
    virtualContributorService = module.get(VirtualContributorService);
    innovationPackService = module.get(InnovationPackService);
    innovationHubService = module.get(InnovationHubService);
    licenseService = module.get(LicenseService);
  });

  describe('getAccountOrFail', () => {
    it('should return account when found', async () => {
      // Arrange
      const mockAccount = { id: 'account-1' } as Account;
      db.query.accounts.findFirst.mockResolvedValueOnce(mockAccount);

      // Act
      const result = await service.getAccountOrFail('account-1');

      // Assert
      expect(result).toBe(mockAccount);
    });

    it('should throw EntityNotFoundException when account not found', async () => {
      // Arrange — findFirst returns undefined by default

      // Act & Assert
      await expect(service.getAccountOrFail('missing-id')).rejects.toThrow(
        'Unable to find Account with ID: missing-id'
      );
    });
  });

  describe('getAccount', () => {
    it('should return null/undefined when account not found', async () => {
      // Arrange — findFirst returns undefined by default

      // Act
      const result = await service.getAccount('nonexistent');

      // Assert
      expect(result).toBeFalsy();
    });

    it('should return account when found', async () => {
      // Arrange
      const mockAccount = { id: 'account-1' } as Account;
      db.query.accounts.findFirst.mockResolvedValueOnce(mockAccount);

      // Act
      const result = await service.getAccount('account-1');

      // Assert
      expect(result).toBe(mockAccount);
    });
  });

  describe('getAgentOrFail', () => {
    it('should return agent when account has one', async () => {
      // Arrange
      const mockAgent = { id: 'agent-1' };
      const mockAccount = { id: 'account-1', agent: mockAgent } as Account;
      db.query.accounts.findFirst.mockResolvedValueOnce(mockAccount);

      // Act
      const result = await service.getAgentOrFail('account-1');

      // Assert
      expect(result).toBe(mockAgent);
    });

    it('should throw EntityNotInitializedException when agent not loaded', async () => {
      // Arrange
      const mockAccount = {
        id: 'account-1',
        agent: undefined,
      } as Account;
      db.query.accounts.findFirst.mockResolvedValueOnce(mockAccount);

      // Act & Assert
      await expect(service.getAgentOrFail('account-1')).rejects.toThrow(
        'Unable to load Agent for Account'
      );
    });
  });

  describe('getStorageAggregatorOrFail', () => {
    it('should return storage aggregator when found', async () => {
      // Arrange
      const mockStorageAggregator = { id: 'storage-1' };
      const mockAccount = {
        id: 'account-1',
        storageAggregator: mockStorageAggregator,
      } as Account;
      db.query.accounts.findFirst.mockResolvedValueOnce(mockAccount);

      // Act
      const result = await service.getStorageAggregatorOrFail('account-1');

      // Assert
      expect(result).toBe(mockStorageAggregator);
    });

    it('should throw RelationshipNotFoundException when storage aggregator not loaded', async () => {
      // Arrange
      const mockAccount = {
        id: 'account-1',
        storageAggregator: undefined,
      } as Account;
      db.query.accounts.findFirst.mockResolvedValueOnce(mockAccount);

      // Act & Assert
      await expect(
        service.getStorageAggregatorOrFail('account-1')
      ).rejects.toThrow(
        'Unable to load storage aggregator for account account-1'
      );
    });
  });

  describe('deleteAccountOrFail', () => {
    it('should throw RelationshipNotFoundException when agent is missing', async () => {
      // Arrange
      const mockAccount = {
        id: 'account-1',
        agent: undefined,
        spaces: [],
        virtualContributors: [],
        innovationPacks: [],
        storageAggregator: { id: 'storage-1' },
        innovationHubs: [],
        license: { id: 'license-1' },
      } as unknown as Account;
      db.query.accounts.findFirst.mockResolvedValueOnce(mockAccount);

      // Act & Assert
      await expect(service.deleteAccountOrFail(mockAccount)).rejects.toThrow(
        'Unable to load all entities for deletion of account account-1'
      );
    });

    it('should throw RelationshipNotFoundException when license is missing', async () => {
      // Arrange
      const mockAccount = {
        id: 'account-1',
        agent: { id: 'agent-1' },
        spaces: [],
        virtualContributors: [],
        innovationPacks: [],
        storageAggregator: { id: 'storage-1' },
        innovationHubs: [],
        license: undefined,
      } as unknown as Account;
      db.query.accounts.findFirst.mockResolvedValueOnce(mockAccount);

      // Act & Assert
      await expect(service.deleteAccountOrFail(mockAccount)).rejects.toThrow(
        'Unable to load all entities for deletion of account account-1'
      );
    });

    it('should delete all related entities and return account with original ID', async () => {
      // Arrange
      const mockAccount = {
        id: 'account-1',
        agent: { id: 'agent-1' },
        spaces: [{ id: 'space-1' }, { id: 'space-2' }],
        virtualContributors: [{ id: 'vc-1' }],
        innovationPacks: [{ id: 'ip-1' }],
        storageAggregator: { id: 'storage-1' },
        innovationHubs: [{ id: 'hub-1' }],
        license: { id: 'license-1' },
      } as unknown as Account;
      db.query.accounts.findFirst.mockResolvedValueOnce(mockAccount);

      agentService.deleteAgent = vi.fn().mockResolvedValue(undefined);
      storageAggregatorService.delete = vi.fn().mockResolvedValue(undefined);
      licenseService.removeLicenseOrFail = vi.fn().mockResolvedValue(undefined);
      virtualContributorService.deleteVirtualContributor = vi
        .fn()
        .mockResolvedValue(undefined);
      innovationPackService.deleteInnovationPack = vi
        .fn()
        .mockResolvedValue(undefined);
      innovationHubService.delete = vi.fn().mockResolvedValue(undefined);
      spaceService.deleteSpaceOrFail = vi.fn().mockResolvedValue(undefined);

      // Act
      const result = await service.deleteAccountOrFail(mockAccount);

      // Assert
      expect(agentService.deleteAgent).toHaveBeenCalledWith('agent-1');
      expect(storageAggregatorService.delete).toHaveBeenCalledWith('storage-1');
      expect(licenseService.removeLicenseOrFail).toHaveBeenCalledWith(
        'license-1'
      );
      expect(
        virtualContributorService.deleteVirtualContributor
      ).toHaveBeenCalledWith('vc-1');
      expect(innovationPackService.deleteInnovationPack).toHaveBeenCalledWith({
        ID: 'ip-1',
      });
      expect(innovationHubService.delete).toHaveBeenCalledWith('hub-1');
      expect(spaceService.deleteSpaceOrFail).toHaveBeenCalledTimes(2);
      expect(result.id).toBe('account-1');
    });
  });

  describe('getAccounts', () => {
    it('should return empty array when no accounts found', async () => {
      // Arrange — findMany returns [] by default

      // Act
      const result = await service.getAccounts();

      // Assert
      expect(result).toEqual([]);
    });

    it('should return accounts when found', async () => {
      // Arrange
      const mockAccounts = [
        { id: 'account-1' } as Account,
        { id: 'account-2' } as Account,
      ];
      db.query.accounts.findMany.mockResolvedValueOnce(mockAccounts);

      // Act
      const result = await service.getAccounts();

      // Assert
      expect(result).toHaveLength(2);
    });
  });

  describe('getAccountAndDetails', () => {
    it('should return undefined when account not found', async () => {
      // Arrange — db.execute returns [] by default, destructuring gives undefined

      // Act
      const result = await service.getAccountAndDetails('missing-id');

      // Assert
      expect(result).toBeUndefined();
    });

    it('should return formatted account details with user data', async () => {
      // Arrange
      const queryResult = {
        accountId: 'account-1',
        externalSubscriptionID: 'ext-sub-1',
        userId: 'user-1',
        userEmail: 'user@example.com',
        userName: 'John Doe',
        orgId: null,
        orgContactEmail: null,
        orgLegalName: null,
        orgDisplayName: null,
        orgNameID: null,
      };
      db.execute.mockResolvedValueOnce([queryResult]);

      // Act
      const result = await service.getAccountAndDetails('account-1');

      // Assert
      expect(result).toEqual({
        accountID: 'account-1',
        externalSubscriptionID: 'ext-sub-1',
        user: {
          id: 'user-1',
          email: 'user@example.com',
          name: 'John Doe',
        },
        organization: undefined,
      });
    });

    it('should return formatted account details with organization data', async () => {
      // Arrange
      const queryResult = {
        accountId: 'account-1',
        externalSubscriptionID: null,
        userId: null,
        userEmail: null,
        userName: null,
        orgId: 'org-1',
        orgContactEmail: 'org@example.com',
        orgLegalName: 'Legal Corp',
        orgDisplayName: 'Display Corp',
        orgNameID: 'org-name',
      };
      db.execute.mockResolvedValueOnce([queryResult]);

      // Act
      const result = await service.getAccountAndDetails('account-1');

      // Assert
      expect(result).toEqual({
        accountID: 'account-1',
        externalSubscriptionID: null,
        user: undefined,
        organization: {
          id: 'org-1',
          email: 'org@example.com',
          legalName: 'Legal Corp',
          orgLegalName: 'Legal Corp',
          displayName: 'Display Corp',
          nameID: 'org-name',
        },
      });
    });
  });

  describe('getSubscriptions', () => {
    it('should throw when agent with credentials not found', async () => {
      // Arrange
      const accountInput = { id: 'account-1' } as IAccount;
      const mockAccount = {
        id: 'account-1',
        agent: undefined,
      } as Account;
      db.query.accounts.findFirst.mockResolvedValueOnce(mockAccount);

      // Act & Assert
      await expect(service.getSubscriptions(accountInput)).rejects.toThrow(
        'Unable to find agent with credentials for the account: account-1'
      );
    });

    it('should return empty array when no credentials match subscription types', async () => {
      // Arrange
      const accountInput = { id: 'account-1' } as IAccount;
      const mockAccount = {
        id: 'account-1',
        agent: {
          id: 'agent-1',
          credentials: [{ type: 'non-subscription-type', expires: undefined }],
        },
      } as unknown as Account;
      db.query.accounts.findFirst.mockResolvedValueOnce(mockAccount);

      // Act
      const result = await service.getSubscriptions(accountInput);

      // Assert
      expect(result).toEqual([]);
    });

    it('should return subscriptions matching licensing credential types', async () => {
      // Arrange
      const expiryDate = new Date('2025-12-31');
      const accountInput = { id: 'account-1' } as IAccount;
      const mockAccount = {
        id: 'account-1',
        agent: {
          id: 'agent-1',
          credentials: [
            {
              type: LicensingCredentialBasedCredentialType.SPACE_LICENSE_FREE,
              expires: expiryDate,
            },
            { type: 'non-matching-type', expires: undefined },
            {
              type: LicensingCredentialBasedCredentialType.ACCOUNT_LICENSE_PLUS,
              expires: undefined,
            },
          ],
        },
      } as unknown as Account;
      db.query.accounts.findFirst.mockResolvedValueOnce(mockAccount);

      // Act
      const result = await service.getSubscriptions(accountInput);

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        name: LicensingCredentialBasedCredentialType.SPACE_LICENSE_FREE,
        expires: expiryDate,
      });
      expect(result[1]).toEqual({
        name: LicensingCredentialBasedCredentialType.ACCOUNT_LICENSE_PLUS,
        expires: undefined,
      });
    });
  });
  describe('findNestedRoleSets', () => {
    it('should collect rolesets from nested spaces up to MAX_SPACE_LEVEL', () => {
      // Arrange
      const roleSet0 = { id: 'rs-0' };
      const roleSet1 = { id: 'rs-1' };
      const roleSet2 = { id: 'rs-2' };

      const space = {
        community: { roleSet: roleSet0 },
        subspaces: [
          {
            community: { roleSet: roleSet1 },
            subspaces: [
              {
                community: { roleSet: roleSet2 },
                subspaces: [],
              },
            ],
          },
        ],
      } as any;

      // Act
      const result = (service as any).findNestedRoleSets(space);

      // Assert
      expect(result).toHaveLength(3);
      expect(result[0]).toBe(roleSet0);
      expect(result[1]).toBe(roleSet1);
      expect(result[2]).toBe(roleSet2);
    });

    it('should return empty array when space has no community', () => {
      // Arrange
      const space = {
        community: undefined,
        subspaces: [],
      } as any;

      // Act
      const result = (service as any).findNestedRoleSets(space);

      // Assert
      expect(result).toEqual([]);
    });

    it('should not recurse beyond MAX_SPACE_LEVEL', () => {
      // Arrange -- 4 levels deep (0, 1, 2, 3) where MAX_SPACE_LEVEL is 2
      const space = {
        community: { roleSet: { id: 'rs-0' } },
        subspaces: [
          {
            community: { roleSet: { id: 'rs-1' } },
            subspaces: [
              {
                community: { roleSet: { id: 'rs-2' } },
                subspaces: [
                  {
                    community: { roleSet: { id: 'rs-3' } },
                    subspaces: [],
                  },
                ],
              },
            ],
          },
        ],
      } as any;

      // Act -- starting at L0
      const result = (service as any).findNestedRoleSets(space);

      // Assert -- should only include L0, L1, L2 (3 roleSets, not 4)
      expect(result).toHaveLength(3);
      expect(result[2].id).toBe('rs-2');
    });
  });
});
