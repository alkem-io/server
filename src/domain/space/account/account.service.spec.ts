import { LicensingCredentialBasedCredentialType } from '@common/enums/licensing.credential.based.credential.type';
import { LicenseService } from '@domain/common/license/license.service';
import { VirtualContributorService } from '@domain/community/virtual-contributor/virtual.contributor.service';
import { InnovationHubService } from '@domain/innovation-hub/innovation.hub.service';
import { StorageAggregatorService } from '@domain/storage/storage-aggregator/storage.aggregator.service';
import { InnovationPackService } from '@library/innovation-pack/innovation.pack.service';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { repositoryProviderMockFactory } from '@test/utils/repository.provider.mock.factory';
import { Repository } from 'typeorm';
import { vi } from 'vitest';
import { SpaceService } from '../space/space.service';
import { Account } from './account.entity';
import { IAccount } from './account.interface';
import { AccountService } from './account.service';

describe('AccountService', () => {
  let service: AccountService;
  let accountRepository: Repository<Account>;
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
        repositoryProviderMockFactory(Account),
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(AccountService);
    accountRepository = module.get<Repository<Account>>(
      getRepositoryToken(Account)
    );
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
      vi.spyOn(accountRepository, 'findOne').mockResolvedValue(mockAccount);

      // Act
      const result = await service.getAccountOrFail('account-1');

      // Assert
      expect(result).toBe(mockAccount);
    });

    it('should throw EntityNotFoundException when account not found', async () => {
      // Arrange
      vi.spyOn(accountRepository, 'findOne').mockResolvedValue(null);

      // Act & Assert
      await expect(service.getAccountOrFail('missing-id')).rejects.toThrow(
        'Unable to find Account with ID: missing-id'
      );
    });
  });

  describe('getAccount', () => {
    it('should return null when account not found', async () => {
      // Arrange
      vi.spyOn(accountRepository, 'findOne').mockResolvedValue(null);

      // Act
      const result = await service.getAccount('nonexistent');

      // Assert
      expect(result).toBeNull();
    });

    it('should return account when found', async () => {
      // Arrange
      const mockAccount = { id: 'account-1' } as Account;
      vi.spyOn(accountRepository, 'findOne').mockResolvedValue(mockAccount);

      // Act
      const result = await service.getAccount('account-1');

      // Assert
      expect(result).toBe(mockAccount);
    });
  });

  describe('getAgentOrFail', () => {
    it('should return the account itself since Account IS the Actor', async () => {
      // Arrange
      const mockAccount = { id: 'account-1' } as Account;
      vi.spyOn(accountRepository, 'findOne').mockResolvedValue(mockAccount);

      // Act
      const result = await service.getAgentOrFail('account-1');

      // Assert
      expect(result).toBe(mockAccount);
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
      vi.spyOn(accountRepository, 'findOne').mockResolvedValue(mockAccount);

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
      vi.spyOn(accountRepository, 'findOne').mockResolvedValue(mockAccount);

      // Act & Assert
      await expect(
        service.getStorageAggregatorOrFail('account-1')
      ).rejects.toThrow(
        'Unable to load storage aggregator for account account-1'
      );
    });
  });

  describe('deleteAccountOrFail', () => {
    it('should throw RelationshipNotFoundException when license is missing', async () => {
      // Arrange
      const mockAccount = {
        id: 'account-1',
        spaces: [],
        virtualContributors: [],
        innovationPacks: [],
        storageAggregator: { id: 'storage-1' },
        innovationHubs: [],
        license: undefined,
      } as unknown as Account;
      vi.spyOn(accountRepository, 'findOne').mockResolvedValue(mockAccount);

      // Act & Assert
      await expect(service.deleteAccountOrFail(mockAccount)).rejects.toThrow(
        'Unable to load all entities for deletion of account account-1'
      );
    });

    it('should delete all related entities and return account with original ID', async () => {
      // Arrange
      const mockAccount = {
        id: 'account-1',
        spaces: [{ id: 'space-1' }, { id: 'space-2' }],
        virtualContributors: [{ id: 'vc-1' }],
        innovationPacks: [{ id: 'ip-1' }],
        storageAggregator: { id: 'storage-1' },
        innovationHubs: [{ id: 'hub-1' }],
        license: { id: 'license-1' },
      } as unknown as Account;

      vi.spyOn(accountRepository, 'findOne').mockResolvedValue(mockAccount);
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
      vi.spyOn(accountRepository, 'remove').mockResolvedValue({
        id: undefined,
      } as unknown as Account);

      // Act
      const result = await service.deleteAccountOrFail(mockAccount);

      // Assert
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
      // Arrange
      vi.spyOn(accountRepository, 'find').mockResolvedValue([]);

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
      vi.spyOn(accountRepository, 'find').mockResolvedValue(mockAccounts);

      // Act
      const result = await service.getAccounts();

      // Assert
      expect(result).toHaveLength(2);
    });
  });

  describe('getAccountAndDetails', () => {
    it('should return undefined when account not found', async () => {
      // Arrange
      vi.spyOn(accountRepository, 'query').mockResolvedValue([]);

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
      vi.spyOn(accountRepository, 'query').mockResolvedValue([queryResult]);

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
      vi.spyOn(accountRepository, 'query').mockResolvedValue([queryResult]);

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
    it('should throw when credentials not found', async () => {
      // Arrange
      const accountInput = { id: 'account-1' } as IAccount;
      const mockAccount = {
        id: 'account-1',
        credentials: undefined,
      } as unknown as Account;
      vi.spyOn(accountRepository, 'findOne').mockResolvedValue(mockAccount);

      // Act & Assert
      await expect(service.getSubscriptions(accountInput)).rejects.toThrow(
        'Unable to find credentials for the account: account-1'
      );
    });

    it('should return empty array when no credentials match subscription types', async () => {
      // Arrange
      const accountInput = { id: 'account-1' } as IAccount;
      const mockAccount = {
        id: 'account-1',
        credentials: [{ type: 'non-subscription-type', expires: undefined }],
      } as unknown as Account;
      vi.spyOn(accountRepository, 'findOne').mockResolvedValue(mockAccount);

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
      } as unknown as Account;
      vi.spyOn(accountRepository, 'findOne').mockResolvedValue(mockAccount);

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

  describe('updateExternalSubscriptionId', () => {
    it('should call repository update with correct arguments', async () => {
      // Arrange
      const updateSpy = vi
        .spyOn(accountRepository, 'update')
        .mockResolvedValue({ affected: 1 } as any);

      // Act
      await service.updateExternalSubscriptionId('account-1', 'ext-sub-new');

      // Assert
      expect(updateSpy).toHaveBeenCalledWith('account-1', {
        externalSubscriptionID: 'ext-sub-new',
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
