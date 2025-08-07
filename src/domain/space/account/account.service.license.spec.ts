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
            limit: 1, // Lower than baseline (2)
            enabled: false,
          },
          {
            id: '2',
            type: LicenseEntitlementType.ACCOUNT_SPACE_PLUS,
            dataType: LicenseEntitlementDataType.LIMIT,
            limit: 0, // Lower than baseline (1)
            enabled: false,
          },
          {
            id: '3',
            type: LicenseEntitlementType.ACCOUNT_SPACE_PREMIUM,
            dataType: LicenseEntitlementDataType.LIMIT,
            limit: 0, // Equal to baseline (0)
            enabled: false,
          },
          {
            id: '4',
            type: LicenseEntitlementType.ACCOUNT_VIRTUAL_CONTRIBUTOR,
            dataType: LicenseEntitlementDataType.LIMIT,
            limit: 5, // Higher than baseline (3)
            enabled: true,
          },
          {
            id: '5',
            type: LicenseEntitlementType.ACCOUNT_INNOVATION_PACK,
            dataType: LicenseEntitlementDataType.LIMIT,
            limit: 0, // Lower than baseline (2)
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

      // Should be updated to baseline value (2) as it's higher than current (1)
      const spaceFreeEntitlement = result.entitlements!.find(
        (e: any) => e.type === LicenseEntitlementType.ACCOUNT_SPACE_FREE
      );
      expect(spaceFreeEntitlement?.limit).toBe(2);
      expect(spaceFreeEntitlement?.enabled).toBe(true);

      // Should be updated to baseline value (1) as it's higher than current (0)
      const spacePlusEntitlement = result.entitlements!.find(
        (e: any) => e.type === LicenseEntitlementType.ACCOUNT_SPACE_PLUS
      );
      expect(spacePlusEntitlement?.limit).toBe(1);
      expect(spacePlusEntitlement?.enabled).toBe(true);

      // Should remain unchanged (0) as baseline equals current
      const spacePremiumEntitlement = result.entitlements!.find(
        (e: any) => e.type === LicenseEntitlementType.ACCOUNT_SPACE_PREMIUM
      );
      expect(spacePremiumEntitlement?.limit).toBe(0);
      expect(spacePremiumEntitlement?.enabled).toBe(false);

      // Should remain unchanged (5) as current is higher than baseline (3)
      const virtualContributorEntitlement = result.entitlements!.find(
        (e: any) =>
          e.type === LicenseEntitlementType.ACCOUNT_VIRTUAL_CONTRIBUTOR
      );
      expect(virtualContributorEntitlement?.limit).toBe(5);
      expect(virtualContributorEntitlement?.enabled).toBe(true);

      // Should be updated to baseline value (2) as it's higher than current (0)
      const innovationPackEntitlement = result.entitlements!.find(
        (e: any) => e.type === LicenseEntitlementType.ACCOUNT_INNOVATION_PACK
      );
      expect(innovationPackEntitlement?.limit).toBe(2);
      expect(innovationPackEntitlement?.enabled).toBe(true);
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
            limit: 3, // Higher than baseline (1)
            enabled: true,
          },
          {
            id: '2',
            type: LicenseEntitlementType.ACCOUNT_VIRTUAL_CONTRIBUTOR,
            dataType: LicenseEntitlementDataType.LIMIT,
            limit: 5, // Higher than baseline (2)
            enabled: true,
          },
        ],
      } as ILicense;

      // Act
      await (service as any).applyBaselineLicensePlan(mockLicense, mockAccount);

      // Assert
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          'Baseline spaceFree value 1 is lower than current entitlement limit 3'
        ),
        'LICENSE'
      );
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          'Baseline virtualContributor value 2 is lower than current entitlement limit 5'
        ),
        'LICENSE'
      );
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
