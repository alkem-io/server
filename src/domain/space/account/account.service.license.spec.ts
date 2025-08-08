import { Test, TestingModule } from '@nestjs/testing';
import { AccountLicenseService } from './account.service.license';
import { LicenseService } from '@domain/common/license/license.service';
import { AccountService } from './account.service';
import { SpaceLicenseService } from '../space/space.service.license';
import { LicensingCredentialBasedService } from '@platform/licensing/credential-based/licensing-credential-based-entitlements-engine/licensing.credential.based.service';
import { LicensingWingbackSubscriptionService } from '@platform/licensing/wingback-subscription/licensing.wingback.subscription.service';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { IAccount } from './account.interface';
import { ILicense } from '@domain/common/license/license.interface';
import { LicenseEntitlementType } from '@common/enums/license.entitlement.type';
import { LicenseEntitlementDataType } from '@common/enums/license.entitlement.data.type';
import { IAccountLicensePlan } from '../account.license.plan/account.license.plan.interface';
import { LogContext } from '@common/enums';

describe('AccountLicenseService', () => {
  let service: AccountLicenseService;

  beforeEach(async () => {
    const mockLicenseService = {
      reset: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccountLicenseService,
        { provide: LicenseService, useValue: mockLicenseService },
        { provide: AccountService, useValue: {} },
        { provide: SpaceLicenseService, useValue: {} },
        { provide: LicensingCredentialBasedService, useValue: {} },
        { provide: LicensingWingbackSubscriptionService, useValue: {} },
        MockWinstonProvider,
      ],
    }).compile();

    service = module.get<AccountLicenseService>(AccountLicenseService);
  });

  describe('applyBaselineLicensePlan', () => {
    it('should apply baseline license plan entitlements only when higher than current values', async () => {
      // Arrange
      const baselineLicensePlan: IAccountLicensePlan = {
        spaceFree: 2,
        spacePlus: 1,
        spacePremium: 0,
        virtualContributor: 3,
        innovationPacks: 2,
        startingPages: 5,
      };

      const mockAccount: Partial<IAccount> = {
        id: 'test-account',
        baselineLicensePlan,
      };

      const mockLicense: ILicense = {
        id: 'test-license',
        type: 'account' as any,
        entitlements: [
          {
            id: '1',
            type: LicenseEntitlementType.ACCOUNT_SPACE_FREE,
            dataType: LicenseEntitlementDataType.LIMIT,
            limit: 1, // Lower than baseline (2) - but space entitlements are NOT processed
            enabled: false,
          },
          {
            id: '2',
            type: LicenseEntitlementType.ACCOUNT_SPACE_PLUS,
            dataType: LicenseEntitlementDataType.LIMIT,
            limit: 0, // Lower than baseline (1) - but space entitlements are NOT processed
            enabled: false,
          },
          {
            id: '3',
            type: LicenseEntitlementType.ACCOUNT_SPACE_PREMIUM,
            dataType: LicenseEntitlementDataType.LIMIT,
            limit: 0, // Equal to baseline (0) - but space entitlements are NOT processed
            enabled: false,
          },
          {
            id: '4',
            type: LicenseEntitlementType.ACCOUNT_VIRTUAL_CONTRIBUTOR,
            dataType: LicenseEntitlementDataType.LIMIT,
            limit: 1, // Lower than baseline (3) - should be updated
            enabled: false,
          },
          {
            id: '5',
            type: LicenseEntitlementType.ACCOUNT_INNOVATION_PACK,
            dataType: LicenseEntitlementDataType.LIMIT,
            limit: 0, // Lower than baseline (2) - should be updated
            enabled: false,
          },
        ],
      } as ILicense;

      // Act
      const result = await (service as any).applyBaselineLicensePlan(
        mockLicense,
        mockAccount
      );

      // Assert
      expect(result.entitlements).toHaveLength(5);

      // Space entitlements should remain unchanged (NOT processed by current logic)
      const spaceFreeEntitlement = result.entitlements!.find(
        (e: any) => e.type === LicenseEntitlementType.ACCOUNT_SPACE_FREE
      );
      expect(spaceFreeEntitlement?.limit).toBe(1); // Unchanged
      expect(spaceFreeEntitlement?.enabled).toBe(false); // Unchanged

      const spacePlusEntitlement = result.entitlements!.find(
        (e: any) => e.type === LicenseEntitlementType.ACCOUNT_SPACE_PLUS
      );
      expect(spacePlusEntitlement?.limit).toBe(0); // Unchanged
      expect(spacePlusEntitlement?.enabled).toBe(false); // Unchanged

      const spacePremiumEntitlement = result.entitlements!.find(
        (e: any) => e.type === LicenseEntitlementType.ACCOUNT_SPACE_PREMIUM
      );
      expect(spacePremiumEntitlement?.limit).toBe(0); // Unchanged
      expect(spacePremiumEntitlement?.enabled).toBe(false); // Unchanged

      // Non-space entitlements should be updated when baseline is higher
      const virtualContributorEntitlement = result.entitlements!.find(
        (e: any) =>
          e.type === LicenseEntitlementType.ACCOUNT_VIRTUAL_CONTRIBUTOR
      );
      expect(virtualContributorEntitlement?.limit).toBe(3); // Updated to baseline
      expect(virtualContributorEntitlement?.enabled).toBe(true); // Enabled

      const innovationPackEntitlement = result.entitlements!.find(
        (e: any) => e.type === LicenseEntitlementType.ACCOUNT_INNOVATION_PACK
      );
      expect(innovationPackEntitlement?.limit).toBe(2); // Updated to baseline
      expect(innovationPackEntitlement?.enabled).toBe(true); // Enabled
    });

    it('should log warning when baseline values are lower than current entitlement limits', async () => {
      // Arrange
      const loggerSpy = jest.spyOn(service['logger'], 'warn');

      const baselineLicensePlan: IAccountLicensePlan = {
        spaceFree: 1,
        spacePlus: 0,
        spacePremium: 0,
        virtualContributor: 2,
        innovationPacks: 1,
        startingPages: 0,
      };

      const mockAccount: Partial<IAccount> = {
        id: 'test-account',
        baselineLicensePlan,
      };

      const mockLicense: ILicense = {
        id: 'test-license',
        type: 'account' as any,
        entitlements: [
          {
            id: '1',
            type: LicenseEntitlementType.ACCOUNT_SPACE_FREE,
            dataType: LicenseEntitlementDataType.LIMIT,
            limit: 3, // Higher than baseline (1) - but space entitlements are NOT processed, so no warning
            enabled: true,
          },
          {
            id: '2',
            type: LicenseEntitlementType.ACCOUNT_VIRTUAL_CONTRIBUTOR,
            dataType: LicenseEntitlementDataType.LIMIT,
            limit: 5, // Higher than baseline (2) - should generate warning
            enabled: true,
          },
        ],
      } as ILicense;

      // Act
      await (service as any).applyBaselineLicensePlan(mockLicense, mockAccount);

      // Assert - only virtualContributor should generate a warning since space entitlements are not processed
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          'Baseline virtualContributor value 2 is lower than current entitlement limit 5'
        ),
        LogContext.LICENSE
      );
      // Should only be called once (for virtualContributor, not for spaceFree)
      expect(loggerSpy).toHaveBeenCalledTimes(1);
    });

    it('should handle equal baseline and current values without changes or warnings', async () => {
      // Arrange
      const loggerWarnSpy = jest.spyOn(service['logger'], 'warn');
      const loggerVerboseSpy = jest.spyOn(service['logger'], 'verbose');

      const baselineLicensePlan: IAccountLicensePlan = {
        spaceFree: 2,
        spacePlus: 0,
        spacePremium: 1,
        virtualContributor: 0,
        innovationPacks: 0,
        startingPages: 0,
      };

      const mockAccount: Partial<IAccount> = {
        id: 'test-account',
        baselineLicensePlan,
      };

      const mockLicense: ILicense = {
        id: 'test-license',
        type: 'account' as any,
        entitlements: [
          {
            id: '1',
            type: LicenseEntitlementType.ACCOUNT_SPACE_FREE,
            dataType: LicenseEntitlementDataType.LIMIT,
            limit: 2, // Equal to baseline
            enabled: true,
          },
          {
            id: '2',
            type: LicenseEntitlementType.ACCOUNT_SPACE_PLUS,
            dataType: LicenseEntitlementDataType.LIMIT,
            limit: 0, // Equal to baseline
            enabled: false,
          },
        ],
      } as ILicense;

      // Act
      const result = await (service as any).applyBaselineLicensePlan(
        mockLicense,
        mockAccount
      );

      // Assert - values should remain unchanged
      const spaceFreeEntitlement = result.entitlements!.find(
        (e: any) => e.type === LicenseEntitlementType.ACCOUNT_SPACE_FREE
      );
      expect(spaceFreeEntitlement?.limit).toBe(2);
      expect(spaceFreeEntitlement?.enabled).toBe(true);

      const spacePlusEntitlement = result.entitlements!.find(
        (e: any) => e.type === LicenseEntitlementType.ACCOUNT_SPACE_PLUS
      );
      expect(spacePlusEntitlement?.limit).toBe(0);
      expect(spacePlusEntitlement?.enabled).toBe(false);

      // Should not log warnings or verbose messages for equal values
      expect(loggerWarnSpy).not.toHaveBeenCalled();
      expect(loggerVerboseSpy).not.toHaveBeenCalled();
    });
  });
});
