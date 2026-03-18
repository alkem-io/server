import { AccountType } from '@common/enums/account.type';
import { LicenseService } from '@domain/common/license/license.service';
import { StorageAggregatorService } from '@domain/storage/storage-aggregator/storage.aggregator.service';
import { Test, TestingModule } from '@nestjs/testing';
import { LicenseIssuerService } from '@platform/licensing/credential-based/license-credential-issuer/license.issuer.service';
import { LicensingFrameworkService } from '@platform/licensing/credential-based/licensing-framework/licensing.framework.service';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { repositoryProviderMockFactory } from '@test/utils/repository.provider.mock.factory';
import { type Mocked, vi } from 'vitest';
import { Account } from '../account/account.entity';
import { DEFAULT_BASELINE_ACCOUNT_LICENSE_PLAN } from '../account/constants';
import { AccountHostService } from './account.host.service';

describe('AccountHostService', () => {
  let service: AccountHostService;
  let licenseService: Mocked<LicenseService>;
  let storageAggregatorService: Mocked<StorageAggregatorService>;
  let licensingFrameworkService: Mocked<LicensingFrameworkService>;
  let licenseIssuerService: Mocked<LicenseIssuerService>;
  let _accountRepository: any;

  beforeEach(async () => {
    vi.restoreAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccountHostService,
        repositoryProviderMockFactory(Account),
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(AccountHostService);
    licenseService = module.get(LicenseService) as Mocked<LicenseService>;
    storageAggregatorService = module.get(
      StorageAggregatorService
    ) as Mocked<StorageAggregatorService>;
    licensingFrameworkService = module.get(
      LicensingFrameworkService
    ) as Mocked<LicensingFrameworkService>;
    licenseIssuerService = module.get(
      LicenseIssuerService
    ) as Mocked<LicenseIssuerService>;
    _accountRepository = module.get(`${Account.name}Repository`);
  });

  describe('createAccount', () => {
    it('should create an account with correct type and baseline license plan', async () => {
      // Arrange
      const mockStorageAggregator = { id: 'storage-1' };
      const _mockAgent = { id: 'agent-1' };
      const mockLicense = { id: 'license-1' };

      storageAggregatorService.createStorageAggregator.mockResolvedValue(
        mockStorageAggregator as unknown as Awaited<
          ReturnType<StorageAggregatorService['createStorageAggregator']>
        >
      );
      // Account IS the Actor now - no separate agent creation
      licenseService.createLicense.mockReturnValue(
        mockLicense as unknown as ReturnType<LicenseService['createLicense']>
      );

      const saveSpy = vi.fn().mockImplementation(account => ({
        ...account,
        id: 'saved-account-1',
      }));
      const mgrSaveSpy = vi.fn().mockImplementation(entity => entity);
      service['accountRepository'] = {
        save: saveSpy,
        manager: {
          save: mgrSaveSpy,
          transaction: vi
            .fn()
            .mockImplementation(cb => cb({ save: mgrSaveSpy })),
        },
      } as unknown as (typeof service)['accountRepository'];

      // Act
      const result = await service.createAccount(AccountType.USER);

      // Assert
      expect(result.accountType).toBe(AccountType.USER);
      expect(result.baselineLicensePlan).toEqual(
        DEFAULT_BASELINE_ACCOUNT_LICENSE_PLAN
      );
      expect(result.storageAggregator).toBe(mockStorageAggregator);
      expect(result.license).toBe(mockLicense);
      expect(mgrSaveSpy).toHaveBeenCalled();
    });

    it('should create license with all entitlement types initialized to 0 and disabled', async () => {
      // Arrange
      storageAggregatorService.createStorageAggregator.mockResolvedValue(
        {} as unknown as Awaited<
          ReturnType<StorageAggregatorService['createStorageAggregator']>
        >
      );
      const createLicenseSpy = vi.fn().mockReturnValue({});
      licenseService.createLicense = createLicenseSpy;
      const mgrSave = vi.fn().mockImplementation(a => a);
      service['accountRepository'] = {
        save: vi.fn().mockImplementation(a => a),
        manager: {
          save: mgrSave,
          transaction: vi.fn().mockImplementation(cb => cb({ save: mgrSave })),
        },
      } as unknown as (typeof service)['accountRepository'];

      // Act
      await service.createAccount(AccountType.ORGANIZATION);

      // Assert
      const createLicenseArg = createLicenseSpy.mock.calls[0][0];
      expect(createLicenseArg.entitlements).toHaveLength(6);
      for (const entitlement of createLicenseArg.entitlements) {
        expect(entitlement.limit).toBe(0);
        expect(entitlement.enabled).toBe(false);
      }
    });
  });

  describe('assignLicensePlansToSpace', () => {
    it('should assign auto-assign plans for user account type', async () => {
      // Arrange
      const mockLicensingFramework = { id: 'framework-1' };
      const mockPlans = [
        {
          id: 'plan-1',
          assignToNewUserAccounts: true,
          assignToNewOrganizationAccounts: false,
        },
        {
          id: 'plan-2',
          assignToNewUserAccounts: false,
          assignToNewOrganizationAccounts: true,
        },
      ];

      licensingFrameworkService.getDefaultLicensingOrFail.mockResolvedValue(
        mockLicensingFramework as unknown as Awaited<
          ReturnType<LicensingFrameworkService['getDefaultLicensingOrFail']>
        >
      );
      licensingFrameworkService.getLicensePlansOrFail.mockResolvedValue(
        mockPlans as unknown as Awaited<
          ReturnType<LicensingFrameworkService['getLicensePlansOrFail']>
        >
      );
      licenseIssuerService.assignLicensePlan.mockResolvedValue(undefined!);

      // Act - new signature: (spaceId, type, licensePlanID?)
      await service.assignLicensePlansToSpace('space-1', AccountType.USER);

      // Assert
      expect(licenseIssuerService.assignLicensePlan).toHaveBeenCalledTimes(1);
      expect(licenseIssuerService.assignLicensePlan).toHaveBeenCalledWith(
        'space-1',
        mockPlans[0],
        'space-1'
      );
    });

    it('should assign auto-assign plans for organization account type', async () => {
      // Arrange
      const mockLicensingFramework = { id: 'framework-1' };
      const mockPlans = [
        {
          id: 'plan-1',
          assignToNewUserAccounts: true,
          assignToNewOrganizationAccounts: false,
        },
        {
          id: 'plan-2',
          assignToNewUserAccounts: false,
          assignToNewOrganizationAccounts: true,
        },
      ];

      licensingFrameworkService.getDefaultLicensingOrFail.mockResolvedValue(
        mockLicensingFramework as unknown as Awaited<
          ReturnType<LicensingFrameworkService['getDefaultLicensingOrFail']>
        >
      );
      licensingFrameworkService.getLicensePlansOrFail.mockResolvedValue(
        mockPlans as unknown as Awaited<
          ReturnType<LicensingFrameworkService['getLicensePlansOrFail']>
        >
      );
      licenseIssuerService.assignLicensePlan.mockResolvedValue(undefined!);

      // Act
      await service.assignLicensePlansToSpace(
        'space-1',
        AccountType.ORGANIZATION
      );

      // Assert
      expect(licenseIssuerService.assignLicensePlan).toHaveBeenCalledTimes(1);
      expect(licenseIssuerService.assignLicensePlan).toHaveBeenCalledWith(
        'space-1',
        mockPlans[1],
        'space-1'
      );
    });

    it('should add additional license plan when licensePlanID is provided and not already assigned', async () => {
      // Arrange
      const mockLicensingFramework = { id: 'framework-1' };
      const autoAssignPlan = {
        id: 'plan-auto',
        assignToNewUserAccounts: true,
        assignToNewOrganizationAccounts: false,
      };
      const additionalPlan = { id: 'plan-additional' };

      licensingFrameworkService.getDefaultLicensingOrFail.mockResolvedValue(
        mockLicensingFramework as unknown as Awaited<
          ReturnType<LicensingFrameworkService['getDefaultLicensingOrFail']>
        >
      );
      licensingFrameworkService.getLicensePlansOrFail.mockResolvedValue([
        autoAssignPlan,
      ] as unknown as Awaited<
        ReturnType<LicensingFrameworkService['getLicensePlansOrFail']>
      >);
      licensingFrameworkService.getLicensePlanOrFail.mockResolvedValue(
        additionalPlan as unknown as Awaited<
          ReturnType<LicensingFrameworkService['getLicensePlanOrFail']>
        >
      );
      licenseIssuerService.assignLicensePlan.mockResolvedValue(undefined!);

      // Act
      await service.assignLicensePlansToSpace(
        'space-1',
        AccountType.USER,
        'plan-additional'
      );

      // Assert
      expect(licenseIssuerService.assignLicensePlan).toHaveBeenCalledTimes(2);
    });

    it('should not duplicate license plan when licensePlanID matches auto-assigned plan', async () => {
      // Arrange
      const mockLicensingFramework = { id: 'framework-1' };
      const autoAssignPlan = {
        id: 'plan-auto',
        assignToNewUserAccounts: true,
        assignToNewOrganizationAccounts: false,
      };

      licensingFrameworkService.getDefaultLicensingOrFail.mockResolvedValue(
        mockLicensingFramework as unknown as Awaited<
          ReturnType<LicensingFrameworkService['getDefaultLicensingOrFail']>
        >
      );
      licensingFrameworkService.getLicensePlansOrFail.mockResolvedValue([
        autoAssignPlan,
      ] as unknown as Awaited<
        ReturnType<LicensingFrameworkService['getLicensePlansOrFail']>
      >);
      licenseIssuerService.assignLicensePlan.mockResolvedValue(undefined!);

      // Act
      await service.assignLicensePlansToSpace(
        'space-1',
        AccountType.USER,
        'plan-auto' // Same as auto-assigned
      );

      // Assert
      expect(licenseIssuerService.assignLicensePlan).toHaveBeenCalledTimes(1);
      expect(
        licensingFrameworkService.getLicensePlanOrFail
      ).not.toHaveBeenCalled();
    });

    it('should assign no plans when none match the account type and no licensePlanID given', async () => {
      // Arrange
      const mockLicensingFramework = { id: 'framework-1' };
      const orgOnlyPlan = {
        id: 'plan-org',
        assignToNewUserAccounts: false,
        assignToNewOrganizationAccounts: true,
      };

      licensingFrameworkService.getDefaultLicensingOrFail.mockResolvedValue(
        mockLicensingFramework as unknown as Awaited<
          ReturnType<LicensingFrameworkService['getDefaultLicensingOrFail']>
        >
      );
      licensingFrameworkService.getLicensePlansOrFail.mockResolvedValue([
        orgOnlyPlan,
      ] as unknown as Awaited<
        ReturnType<LicensingFrameworkService['getLicensePlansOrFail']>
      >);
      licenseIssuerService.assignLicensePlan.mockResolvedValue(undefined!);

      // Act
      await service.assignLicensePlansToSpace(
        'space-1',
        AccountType.USER // No user-matching plans
      );

      // Assert
      expect(licenseIssuerService.assignLicensePlan).not.toHaveBeenCalled();
    });
  });
});
