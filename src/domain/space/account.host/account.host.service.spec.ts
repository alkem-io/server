import { AccountType } from '@common/enums/account.type';
import { LicenseService } from '@domain/common/license/license.service';
import { StorageAggregatorService } from '@domain/storage/storage-aggregator/storage.aggregator.service';
import { Test, TestingModule } from '@nestjs/testing';
import { LicenseIssuerService } from '@platform/licensing/credential-based/license-credential-issuer/license.issuer.service';
import { LicensingFrameworkService } from '@platform/licensing/credential-based/licensing-framework/licensing.framework.service';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { repositoryProviderMockFactory } from '@test/utils/repository.provider.mock.factory';
import { vi } from 'vitest';
import { Account } from '../account/account.entity';
import { DEFAULT_BASELINE_ACCOUNT_LICENSE_PLAN } from '../account/constants';
import { AccountHostService } from './account.host.service';

describe('AccountHostService', () => {
  let service: AccountHostService;
  let licenseService: LicenseService;
  let storageAggregatorService: StorageAggregatorService;
  let licensingFrameworkService: LicensingFrameworkService;
  let licenseIssuerService: LicenseIssuerService;
  let _accountRepository: any;

  beforeEach(async () => {
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
    licenseService = module.get(LicenseService);
    storageAggregatorService = module.get(StorageAggregatorService);
    licensingFrameworkService = module.get(LicensingFrameworkService);
    licenseIssuerService = module.get(LicenseIssuerService);
    _accountRepository = module.get(`${Account.name}Repository`);
  });

  describe('createAccount', () => {
    it('should create an account with correct type and baseline license plan', async () => {
      // Arrange
      const mockStorageAggregator = { id: 'storage-1' };
      const _mockAgent = { id: 'agent-1' };
      const mockLicense = { id: 'license-1' };

      storageAggregatorService.createStorageAggregator = vi
        .fn()
        .mockResolvedValue(mockStorageAggregator);
      // Account IS the Actor now - no separate agent creation
      licenseService.createLicense = vi.fn().mockReturnValue(mockLicense);

      const saveSpy = vi.fn().mockImplementation(account => ({
        ...account,
        id: 'saved-account-1',
      }));
      service['accountRepository'] = { save: saveSpy } as any;

      // Act
      const result = await service.createAccount(AccountType.USER);

      // Assert
      expect(result.accountType).toBe(AccountType.USER);
      expect(result.baselineLicensePlan).toEqual(
        DEFAULT_BASELINE_ACCOUNT_LICENSE_PLAN
      );
      expect(result.storageAggregator).toBe(mockStorageAggregator);
      expect(result.license).toBe(mockLicense);
      expect(saveSpy).toHaveBeenCalled();
    });

    it('should create license with all entitlement types initialized to 0 and disabled', async () => {
      // Arrange
      storageAggregatorService.createStorageAggregator = vi
        .fn()
        .mockResolvedValue({});
      const createLicenseSpy = vi.fn().mockReturnValue({});
      licenseService.createLicense = createLicenseSpy;
      service['accountRepository'] = {
        save: vi.fn().mockImplementation(a => a),
      } as any;

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

      licensingFrameworkService.getDefaultLicensingOrFail = vi
        .fn()
        .mockResolvedValue(mockLicensingFramework);
      licensingFrameworkService.getLicensePlansOrFail = vi
        .fn()
        .mockResolvedValue(mockPlans);
      licenseIssuerService.assignLicensePlan = vi.fn().mockResolvedValue({});

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

      licensingFrameworkService.getDefaultLicensingOrFail = vi
        .fn()
        .mockResolvedValue(mockLicensingFramework);
      licensingFrameworkService.getLicensePlansOrFail = vi
        .fn()
        .mockResolvedValue(mockPlans);
      licenseIssuerService.assignLicensePlan = vi.fn().mockResolvedValue({});

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

      licensingFrameworkService.getDefaultLicensingOrFail = vi
        .fn()
        .mockResolvedValue(mockLicensingFramework);
      licensingFrameworkService.getLicensePlansOrFail = vi
        .fn()
        .mockResolvedValue([autoAssignPlan]);
      licensingFrameworkService.getLicensePlanOrFail = vi
        .fn()
        .mockResolvedValue(additionalPlan);
      licenseIssuerService.assignLicensePlan = vi.fn().mockResolvedValue({});

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

      licensingFrameworkService.getDefaultLicensingOrFail = vi
        .fn()
        .mockResolvedValue(mockLicensingFramework);
      licensingFrameworkService.getLicensePlansOrFail = vi
        .fn()
        .mockResolvedValue([autoAssignPlan]);
      licenseIssuerService.assignLicensePlan = vi.fn().mockResolvedValue({});

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

      licensingFrameworkService.getDefaultLicensingOrFail = vi
        .fn()
        .mockResolvedValue(mockLicensingFramework);
      licensingFrameworkService.getLicensePlansOrFail = vi
        .fn()
        .mockResolvedValue([orgOnlyPlan]);
      licenseIssuerService.assignLicensePlan = vi.fn().mockResolvedValue({});

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
