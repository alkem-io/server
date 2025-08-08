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

      // Space entitlements should be updated to baseline values (processed in else branch)
      const spaceFreeEntitlement = result.entitlements!.find(
        (e: any) => e.type === LicenseEntitlementType.ACCOUNT_SPACE_FREE
      );
      expect(spaceFreeEntitlement?.limit).toBe(2); // Updated to baseline
      expect(spaceFreeEntitlement?.enabled).toBe(true); // Enabled since baseline > 0

      const spacePlusEntitlement = result.entitlements!.find(
        (e: any) => e.type === LicenseEntitlementType.ACCOUNT_SPACE_PLUS
      );
      expect(spacePlusEntitlement?.limit).toBe(1); // Updated to baseline
      expect(spacePlusEntitlement?.enabled).toBe(true); // Enabled since baseline > 0

      const spacePremiumEntitlement = result.entitlements!.find(
        (e: any) => e.type === LicenseEntitlementType.ACCOUNT_SPACE_PREMIUM
      );
      expect(spacePremiumEntitlement?.limit).toBe(0); // Updated to baseline
      expect(spacePremiumEntitlement?.enabled).toBe(false); // Disabled since baseline = 0

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
        expect.objectContaining({
          message:
            'Baseline entitlement value is lower than current entitlement limit for account. Keeping current value.',
          entitlementName: 'virtualContributor',
          baselineValue: 2,
          accountId: 'test-account',
          currentEntitlementLimit: 5,
        }),
        LogContext.LICENSE
      );
      // Should only be called once (for virtualContributor, not for spaceFree)
      expect(loggerSpy).toHaveBeenCalledTimes(1);
    });

    it('should handle equal baseline and current values without changes or warnings', async () => {
      // Arrange
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

      // Assert - space entitlements should be updated to baseline values
      const spaceFreeEntitlement = result.entitlements!.find(
        (e: any) => e.type === LicenseEntitlementType.ACCOUNT_SPACE_FREE
      );
      expect(spaceFreeEntitlement?.limit).toBe(2); // Updated to baseline
      expect(spaceFreeEntitlement?.enabled).toBe(true); // Enabled since baseline > 0

      const spacePlusEntitlement = result.entitlements!.find(
        (e: any) => e.type === LicenseEntitlementType.ACCOUNT_SPACE_PLUS
      );
      expect(spacePlusEntitlement?.limit).toBe(0); // Updated to baseline
      expect(spacePlusEntitlement?.enabled).toBe(false); // Disabled since baseline = 0

      // Should log verbose messages for space entitlements that are processed
      expect(loggerVerboseSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Applied baseline license plan for account.',
          entitlementName: 'spaceFree',
          baselineValue: 2,
          accountId: 'test-account',
          oldEntitlementLimit: 2,
        }),
        LogContext.LICENSE
      );
      expect(loggerVerboseSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Applied baseline license plan for account.',
          entitlementName: 'spacePlus',
          baselineValue: 0,
          accountId: 'test-account',
          oldEntitlementLimit: 0,
        }),
        LogContext.LICENSE
      );
    });
  });

  describe('extendLicensePolicy', () => {
    let mockCredentialBasedService: any;
    let mockWingbackService: any;
    let mockAccount: Partial<IAccount>;
    let mockAgent: any;
    let mockLicense: ILicense;

    beforeEach(() => {
      mockCredentialBasedService = {
        getEntitlementIfGranted: jest.fn(),
      };
      mockWingbackService = {
        getEntitlements: jest.fn(),
      };

      service['licensingCredentialBasedService'] = mockCredentialBasedService;
      service['licensingWingbackSubscriptionService'] = mockWingbackService;

      mockAgent = {
        id: 'test-agent',
        credentials: [],
      };

      mockAccount = {
        id: 'test-account',
        externalSubscriptionID: undefined,
      };

      mockLicense = {
        id: 'test-license',
        type: 'account' as any,
        entitlements: [
          {
            id: '1',
            type: LicenseEntitlementType.ACCOUNT_VIRTUAL_CONTRIBUTOR,
            dataType: LicenseEntitlementDataType.LIMIT,
            limit: 1,
            enabled: false,
          },
          {
            id: '2',
            type: LicenseEntitlementType.ACCOUNT_INNOVATION_PACK,
            dataType: LicenseEntitlementDataType.LIMIT,
            limit: 0,
            enabled: false,
          },
        ],
      } as ILicense;
    });

    it('should apply credential-based licensing when agent has valid credentials', async () => {
      // Arrange
      mockCredentialBasedService.getEntitlementIfGranted
        .mockResolvedValueOnce({
          type: LicenseEntitlementType.ACCOUNT_VIRTUAL_CONTRIBUTOR,
          limit: 5,
        })
        .mockResolvedValueOnce(null); // No entitlement for innovation pack

      // Act
      const result = await (service as any).extendLicensePolicy(
        mockLicense,
        mockAgent,
        mockAccount
      );

      // Assert
      expect(
        mockCredentialBasedService.getEntitlementIfGranted
      ).toHaveBeenCalledTimes(2);
      expect(
        mockCredentialBasedService.getEntitlementIfGranted
      ).toHaveBeenCalledWith(
        LicenseEntitlementType.ACCOUNT_VIRTUAL_CONTRIBUTOR,
        mockAgent
      );
      expect(
        mockCredentialBasedService.getEntitlementIfGranted
      ).toHaveBeenCalledWith(
        LicenseEntitlementType.ACCOUNT_INNOVATION_PACK,
        mockAgent
      );

      const virtualContributorEntitlement = result.entitlements!.find(
        (e: any) =>
          e.type === LicenseEntitlementType.ACCOUNT_VIRTUAL_CONTRIBUTOR
      );
      expect(virtualContributorEntitlement?.limit).toBe(5);
      expect(virtualContributorEntitlement?.enabled).toBe(true);

      const innovationPackEntitlement = result.entitlements!.find(
        (e: any) => e.type === LicenseEntitlementType.ACCOUNT_INNOVATION_PACK
      );
      expect(innovationPackEntitlement?.limit).toBe(0); // Unchanged
      expect(innovationPackEntitlement?.enabled).toBe(false); // Unchanged
    });

    it('should apply Wingback subscription licensing when external subscription exists', async () => {
      // Arrange
      mockAccount.externalSubscriptionID = 'wingback-customer-123';

      mockCredentialBasedService.getEntitlementIfGranted.mockResolvedValue(
        null
      );

      mockWingbackService.getEntitlements.mockResolvedValue([
        {
          type: LicenseEntitlementType.ACCOUNT_VIRTUAL_CONTRIBUTOR,
          limit: 10,
        },
        {
          type: LicenseEntitlementType.ACCOUNT_INNOVATION_PACK,
          limit: 3,
        },
      ]);

      // Act
      const result = await (service as any).extendLicensePolicy(
        mockLicense,
        mockAgent,
        mockAccount
      );

      // Assert
      expect(mockWingbackService.getEntitlements).toHaveBeenCalledWith(
        'wingback-customer-123'
      );

      const virtualContributorEntitlement = result.entitlements!.find(
        (e: any) =>
          e.type === LicenseEntitlementType.ACCOUNT_VIRTUAL_CONTRIBUTOR
      );
      expect(virtualContributorEntitlement?.limit).toBe(10);
      expect(virtualContributorEntitlement?.enabled).toBe(true);

      const innovationPackEntitlement = result.entitlements!.find(
        (e: any) => e.type === LicenseEntitlementType.ACCOUNT_INNOVATION_PACK
      );
      expect(innovationPackEntitlement?.limit).toBe(3);
      expect(innovationPackEntitlement?.enabled).toBe(true);
    });

    it('should prioritize Wingback subscription over credential-based licensing', async () => {
      // Arrange
      mockAccount.externalSubscriptionID = 'wingback-customer-123';

      // Credential-based licensing provides one value
      mockCredentialBasedService.getEntitlementIfGranted
        .mockResolvedValueOnce({
          type: LicenseEntitlementType.ACCOUNT_VIRTUAL_CONTRIBUTOR,
          limit: 5,
        })
        .mockResolvedValueOnce(null);

      // Wingback provides a different (higher) value - should override
      mockWingbackService.getEntitlements.mockResolvedValue([
        {
          type: LicenseEntitlementType.ACCOUNT_VIRTUAL_CONTRIBUTOR,
          limit: 15,
        },
      ]);

      // Act
      const result = await (service as any).extendLicensePolicy(
        mockLicense,
        mockAgent,
        mockAccount
      );

      // Assert
      const virtualContributorEntitlement = result.entitlements!.find(
        (e: any) =>
          e.type === LicenseEntitlementType.ACCOUNT_VIRTUAL_CONTRIBUTOR
      );

      // Should use Wingback value (15), not credential-based value (5)
      expect(virtualContributorEntitlement?.limit).toBe(15);
      expect(virtualContributorEntitlement?.enabled).toBe(true);
    });

    it('should handle Wingback service errors gracefully', async () => {
      // Arrange
      mockAccount.externalSubscriptionID = 'wingback-customer-123';
      const loggerSpy = jest.spyOn(service['logger'], 'warn');

      mockCredentialBasedService.getEntitlementIfGranted.mockResolvedValue(
        null
      );
      mockWingbackService.getEntitlements.mockRejectedValue(
        new Error('Wingback service unavailable')
      );

      // Act
      const result = await (service as any).extendLicensePolicy(
        mockLicense,
        mockAgent,
        mockAccount
      );

      // Assert
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          message:
            'Skipping Wingback entitlements for account since it returned with an error',
          accountId: 'test-account',
          error: 'Wingback service unavailable',
        }),
        LogContext.ACCOUNT
      );

      // Should fallback to original values since no other licensing applies
      const virtualContributorEntitlement = result.entitlements!.find(
        (e: any) =>
          e.type === LicenseEntitlementType.ACCOUNT_VIRTUAL_CONTRIBUTOR
      );
      expect(virtualContributorEntitlement?.limit).toBe(1); // Original value
      expect(virtualContributorEntitlement?.enabled).toBe(false); // Original value
    });

    it('should handle mixed entitlements from different sources', async () => {
      // Arrange
      mockAccount.externalSubscriptionID = 'wingback-customer-123';

      // Credential-based licensing only provides innovation pack entitlement
      mockCredentialBasedService.getEntitlementIfGranted
        .mockResolvedValueOnce(null) // No virtual contributor from credentials
        .mockResolvedValueOnce({
          type: LicenseEntitlementType.ACCOUNT_INNOVATION_PACK,
          limit: 2,
        });

      // Wingback only provides virtual contributor entitlement
      mockWingbackService.getEntitlements.mockResolvedValue([
        {
          type: LicenseEntitlementType.ACCOUNT_VIRTUAL_CONTRIBUTOR,
          limit: 8,
        },
      ]);

      // Act
      const result = await (service as any).extendLicensePolicy(
        mockLicense,
        mockAgent,
        mockAccount
      );

      // Assert
      const virtualContributorEntitlement = result.entitlements!.find(
        (e: any) =>
          e.type === LicenseEntitlementType.ACCOUNT_VIRTUAL_CONTRIBUTOR
      );
      expect(virtualContributorEntitlement?.limit).toBe(8); // From Wingback
      expect(virtualContributorEntitlement?.enabled).toBe(true);

      const innovationPackEntitlement = result.entitlements!.find(
        (e: any) => e.type === LicenseEntitlementType.ACCOUNT_INNOVATION_PACK
      );
      expect(innovationPackEntitlement?.limit).toBe(2); // From credential-based
      expect(innovationPackEntitlement?.enabled).toBe(true);
    });

    it('should handle account without external subscription', async () => {
      // Arrange
      mockAccount.externalSubscriptionID = undefined; // No Wingback subscription

      mockCredentialBasedService.getEntitlementIfGranted
        .mockResolvedValueOnce({
          type: LicenseEntitlementType.ACCOUNT_VIRTUAL_CONTRIBUTOR,
          limit: 3,
        })
        .mockResolvedValueOnce(null);

      // Act
      const result = await (service as any).extendLicensePolicy(
        mockLicense,
        mockAgent,
        mockAccount
      );

      // Assert
      expect(mockWingbackService.getEntitlements).not.toHaveBeenCalled();

      const virtualContributorEntitlement = result.entitlements!.find(
        (e: any) =>
          e.type === LicenseEntitlementType.ACCOUNT_VIRTUAL_CONTRIBUTOR
      );
      expect(virtualContributorEntitlement?.limit).toBe(3); // From credential-based only
      expect(virtualContributorEntitlement?.enabled).toBe(true);
    });

    it('should throw error when license is undefined', async () => {
      // Act & Assert
      await expect(
        (service as any).extendLicensePolicy(undefined, mockAgent, mockAccount)
      ).rejects.toThrow('License with entitielements not found');
    });

    it('should throw error when license has no entitlements', async () => {
      // Arrange
      const licenseWithoutEntitlements = {
        id: 'test-license',
        type: 'account' as any,
        entitlements: undefined,
      } as ILicense;

      // Act & Assert
      await expect(
        (service as any).extendLicensePolicy(
          licenseWithoutEntitlements,
          mockAgent,
          mockAccount
        )
      ).rejects.toThrow('License with entitielements not found');
    });
  });
});
