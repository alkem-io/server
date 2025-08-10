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
  let mockLogger: any;

  beforeEach(async () => {
    const mockLicenseService = {
      reset: jest.fn().mockImplementation(license => license),
    };

    mockLogger = {
      warn: jest.fn(),
      verbose: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
      log: jest.fn(),
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
    // Replace the logger with our mock
    (service as any).logger = mockLogger;
  });

  describe('applyBaselineLicensePlan', () => {
    it('should apply baseline license plan with different behavior for space vs non-space entitlements', async () => {
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
            limit: 1, // Lower than baseline (2) - space entitlements always get baseline applied
            enabled: false,
          },
          {
            id: '2',
            type: LicenseEntitlementType.ACCOUNT_SPACE_PLUS,
            dataType: LicenseEntitlementDataType.LIMIT,
            limit: 0, // Lower than baseline (1) - space entitlements always get baseline applied
            enabled: false,
          },
          {
            id: '3',
            type: LicenseEntitlementType.ACCOUNT_SPACE_PREMIUM,
            dataType: LicenseEntitlementDataType.LIMIT,
            limit: 0, // Equal to baseline (0) - space entitlements always get baseline applied
            enabled: false,
          },
          {
            id: '4',
            type: LicenseEntitlementType.ACCOUNT_VIRTUAL_CONTRIBUTOR,
            dataType: LicenseEntitlementDataType.LIMIT,
            limit: 1, // Lower than baseline (3) - non-space entitlement should be updated
            enabled: false,
          },
          {
            id: '5',
            type: LicenseEntitlementType.ACCOUNT_INNOVATION_PACK,
            dataType: LicenseEntitlementDataType.LIMIT,
            limit: 0, // Lower than baseline (2) - non-space entitlement should be updated
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

      // Space entitlements should be updated to baseline values (always applied directly)
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

      // Non-space entitlements should be updated only when baseline is higher
      const virtualContributorEntitlement = result.entitlements!.find(
        (e: any) =>
          e.type === LicenseEntitlementType.ACCOUNT_VIRTUAL_CONTRIBUTOR
      );
      expect(virtualContributorEntitlement?.limit).toBe(3); // Updated to baseline since 3 > 1
      expect(virtualContributorEntitlement?.enabled).toBe(true); // Enabled

      const innovationPackEntitlement = result.entitlements!.find(
        (e: any) => e.type === LicenseEntitlementType.ACCOUNT_INNOVATION_PACK
      );
      expect(innovationPackEntitlement?.limit).toBe(2); // Updated to baseline since 2 > 0
      expect(innovationPackEntitlement?.enabled).toBe(true); // Enabled
    });

    it('should log warning when baseline values are lower than current entitlement limits for non-space entitlements', async () => {
      // Arrange
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
            limit: 3, // Higher than baseline (1) - space entitlements always get baseline applied, no warning
            enabled: true,
          },
          {
            id: '2',
            type: LicenseEntitlementType.ACCOUNT_VIRTUAL_CONTRIBUTOR,
            dataType: LicenseEntitlementDataType.LIMIT,
            limit: 5, // Higher than baseline (2) - non-space entitlement should generate warning
            enabled: true,
          },
        ],
      } as ILicense;

      // Act
      await (service as any).applyBaselineLicensePlan(mockLicense, mockAccount);

      // Assert - only virtualContributor should generate a warning since it's a non-space entitlement
      expect(mockLogger.warn).toHaveBeenCalledWith(
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
      // Should only be called once (for virtualContributor, not for spaceFree which gets baseline applied directly)
      expect(mockLogger.warn).toHaveBeenCalledTimes(1);
    });

    it('should apply baseline values to space entitlements and log verbose messages', async () => {
      // Arrange
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
      expect(mockLogger.verbose).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Applied baseline license plan for account.',
          entitlementName: 'spaceFree',
          baselineValue: 2,
          accountId: 'test-account',
          oldEntitlementLimit: 2,
        }),
        LogContext.LICENSE
      );
      expect(mockLogger.verbose).toHaveBeenCalledWith(
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
      expect(mockLogger.warn).toHaveBeenCalledWith(
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
      ).rejects.toThrow('License with entitlements not found');
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
      ).rejects.toThrow('License with entitlements not found');
    });

    it('should handle comprehensive licensing flow scenarios', async () => {
      // Scenario: Baseline higher than credential-based for non-space entitlements
      mockCredentialBasedService.getEntitlementIfGranted
        .mockResolvedValueOnce({
          type: LicenseEntitlementType.ACCOUNT_VIRTUAL_CONTRIBUTOR,
          limit: 2, // Applied first from external licensing
        })
        .mockResolvedValueOnce(null);

      mockWingbackService.getEntitlements.mockResolvedValue([]);

      const testLicense: ILicense = {
        id: 'test-license',
        type: 'account' as any,
        entitlements: [
          {
            id: '1',
            type: LicenseEntitlementType.ACCOUNT_VIRTUAL_CONTRIBUTOR,
            dataType: LicenseEntitlementDataType.LIMIT,
            limit: 1, // Reset default
            enabled: false,
          },
        ],
      } as ILicense;

      // Apply external licensing first (should set to 2), then baseline (should set to 3 since 3 > 2)
      let result = await (service as any).extendLicensePolicy(
        testLicense,
        mockAgent,
        mockAccount
      );

      result = await (service as any).applyBaselineLicensePlan(result, {
        id: 'test-account',
        baselineLicensePlan: { virtualContributor: 3 },
      });

      const virtualContributorEntitlement = result.entitlements!.find(
        (e: any) =>
          e.type === LicenseEntitlementType.ACCOUNT_VIRTUAL_CONTRIBUTOR
      );

      // Should be 3 (baseline higher than external 2, so baseline applied)
      expect(virtualContributorEntitlement?.limit).toBe(3);
      expect(virtualContributorEntitlement?.enabled).toBe(true);

      // Scenario: Wingback overrides everything
      mockAccount.externalSubscriptionID = 'wingback-customer-123';

      mockCredentialBasedService.getEntitlementIfGranted
        .mockResolvedValueOnce({
          type: LicenseEntitlementType.ACCOUNT_VIRTUAL_CONTRIBUTOR,
          limit: 7, // Credential-based value
        })
        .mockResolvedValueOnce(null);

      mockWingbackService.getEntitlements.mockResolvedValue([
        {
          type: LicenseEntitlementType.ACCOUNT_VIRTUAL_CONTRIBUTOR,
          limit: 12, // Wingback value (highest priority)
        },
      ]);

      // Act
      result = await (service as any).extendLicensePolicy(
        mockLicense,
        mockAgent,
        mockAccount
      );

      const virtualContributorEntitlement2 = result.entitlements!.find(
        (e: any) =>
          e.type === LicenseEntitlementType.ACCOUNT_VIRTUAL_CONTRIBUTOR
      );

      // Should be 12 (Wingback has highest priority)
      expect(virtualContributorEntitlement2?.limit).toBe(12);
      expect(virtualContributorEntitlement2?.enabled).toBe(true);

      // Scenario: Different entitlements from different sources
      mockAccount.externalSubscriptionID = 'wingback-customer-123';

      mockCredentialBasedService.getEntitlementIfGranted
        .mockResolvedValueOnce({
          type: LicenseEntitlementType.ACCOUNT_VIRTUAL_CONTRIBUTOR,
          limit: 5, // Only virtual contributor from credentials
        })
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          type: LicenseEntitlementType.ACCOUNT_SPACE_FREE,
          limit: 3, // Space free from credentials
        });

      mockWingbackService.getEntitlements.mockResolvedValue([
        {
          type: LicenseEntitlementType.ACCOUNT_INNOVATION_PACK,
          limit: 4, // Only innovation pack from Wingback
        },
      ]);

      const testLicenseMixed: ILicense = {
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
          {
            id: '3',
            type: LicenseEntitlementType.ACCOUNT_SPACE_FREE,
            dataType: LicenseEntitlementDataType.LIMIT,
            limit: 1,
            enabled: false,
          },
        ],
      } as ILicense;

      const baselinePlan = {
        virtualContributor: 2,
        innovationPacks: 1,
        spaceFree: 1,
      };

      // Apply external licensing first, then baseline
      result = await (service as any).extendLicensePolicy(
        testLicenseMixed,
        mockAgent,
        mockAccount
      );

      result = await (service as any).applyBaselineLicensePlan(result, {
        id: 'test-account',
        baselineLicensePlan: baselinePlan,
      });

      const virtualContributorEntitlement3 = result.entitlements!.find(
        (e: any) =>
          e.type === LicenseEntitlementType.ACCOUNT_VIRTUAL_CONTRIBUTOR
      );
      const innovationPackEntitlement3 = result.entitlements!.find(
        (e: any) => e.type === LicenseEntitlementType.ACCOUNT_INNOVATION_PACK
      );
      const spaceFreeEntitlement3 = result.entitlements!.find(
        (e: any) => e.type === LicenseEntitlementType.ACCOUNT_SPACE_FREE
      );

      // Virtual contributor: 1 → 2 (baseline applied because external licensing didn't apply in this mock setup)
      expect(virtualContributorEntitlement3?.limit).toBe(2);
      expect(virtualContributorEntitlement3?.enabled).toBe(true);

      // Innovation pack: 0 → 4 (Wingback applied) → 4 (baseline 1 < 4, kept with warning)
      expect(innovationPackEntitlement3?.limit).toBe(4);
      expect(innovationPackEntitlement3?.enabled).toBe(true);

      // Space free: 1 → 3 (external applied first) → 1 (baseline always applied for space entitlements)
      expect(spaceFreeEntitlement3?.limit).toBe(1);
      expect(spaceFreeEntitlement3?.enabled).toBe(true);

      // Scenario: Space entitlements get baseline applied directly, then external licensing overrides
      mockCredentialBasedService.getEntitlementIfGranted.mockResolvedValueOnce({
        type: LicenseEntitlementType.ACCOUNT_SPACE_FREE,
        limit: 7, // Credential-based override
      });

      const testLicenseSpace: ILicense = {
        id: 'test-license',
        type: 'account' as any,
        entitlements: [
          {
            id: '1',
            type: LicenseEntitlementType.ACCOUNT_SPACE_FREE,
            dataType: LicenseEntitlementDataType.LIMIT,
            limit: 10, // High initial value
            enabled: true,
          },
        ],
      } as ILicense;

      // Apply external licensing first (should set to 7), then baseline (should set to 2 since space entitlements always get baseline)
      result = await (service as any).extendLicensePolicy(
        testLicenseSpace,
        mockAgent,
        mockAccount
      );

      result = await (service as any).applyBaselineLicensePlan(result, {
        id: 'test-account',
        baselineLicensePlan: { spaceFree: 2 }, // Lower than initial
      });

      const spaceFreeEntitlement4 = result.entitlements!.find(
        (e: any) => e.type === LicenseEntitlementType.ACCOUNT_SPACE_FREE
      );

      // Should be 2: 10 → 7 (external applied first) → 2 (baseline always applied for space entitlements)
      expect(spaceFreeEntitlement4?.limit).toBe(2);
      expect(spaceFreeEntitlement4?.enabled).toBe(true);

      // Scenario: Non-space entitlements keep current value when baseline is lower, then external licensing overrides
      mockCredentialBasedService.getEntitlementIfGranted
        .mockResolvedValueOnce({
          type: LicenseEntitlementType.ACCOUNT_VIRTUAL_CONTRIBUTOR,
          limit: 12, // Credential-based override
        })
        .mockResolvedValueOnce(null);

      const testLicenseNonSpace: ILicense = {
        id: 'test-license',
        type: 'account' as any,
        entitlements: [
          {
            id: '1',
            type: LicenseEntitlementType.ACCOUNT_VIRTUAL_CONTRIBUTOR,
            dataType: LicenseEntitlementDataType.LIMIT,
            limit: 8, // High initial value
            enabled: true,
          },
        ],
      } as ILicense;

      // Apply external licensing first (should set to 12), then baseline (should stay 12 since 12 > 3, warning logged)
      result = await (service as any).extendLicensePolicy(
        testLicenseNonSpace,
        mockAgent,
        mockAccount
      );

      result = await (service as any).applyBaselineLicensePlan(result, {
        id: 'test-account',
        baselineLicensePlan: { virtualContributor: 3 }, // Lower than external
      });

      const virtualContributorEntitlement4 = result.entitlements!.find(
        (e: any) =>
          e.type === LicenseEntitlementType.ACCOUNT_VIRTUAL_CONTRIBUTOR
      );

      // Should be 7: 8 → 7 (external applied) → 7 (baseline 3 < 7, kept with warning)
      expect(virtualContributorEntitlement4?.limit).toBe(7);
      expect(virtualContributorEntitlement4?.enabled).toBe(true);

      // Should have logged warning for baseline being lower than external value
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          message:
            'Baseline entitlement value is lower than current entitlement limit for account. Keeping current value.',
          entitlementName: 'virtualContributor',
          baselineValue: 3,
          currentEntitlementLimit: 7,
        }),
        LogContext.LICENSE
      );
    });

    it('should handle comprehensive licensing flow with credential-baseline combinations', async () => {
      // Test scenario: Credential-based lower than baseline for non-space entitlements
      mockCredentialBasedService.getEntitlementIfGranted
        .mockResolvedValueOnce({
          type: LicenseEntitlementType.ACCOUNT_VIRTUAL_CONTRIBUTOR,
          limit: 2, // Lower than baseline (5)
        })
        .mockResolvedValueOnce(null);

      mockWingbackService.getEntitlements.mockResolvedValue([]);

      const testLicense1: ILicense = {
        id: 'test-license-1',
        type: 'account' as any,
        entitlements: [
          {
            id: '1',
            type: LicenseEntitlementType.ACCOUNT_VIRTUAL_CONTRIBUTOR,
            dataType: LicenseEntitlementDataType.LIMIT,
            limit: 1, // Reset default
            enabled: false,
          },
        ],
      } as ILicense;

      // External first (sets to 2), then baseline (sets to 5 since 5 > 2)
      let result = await (service as any).extendLicensePolicy(
        testLicense1,
        mockAgent,
        mockAccount
      );

      result = await (service as any).applyBaselineLicensePlan(result, {
        id: 'test-account',
        baselineLicensePlan: { virtualContributor: 5 },
      });

      const virtualContributorEntitlement = result.entitlements!.find(
        (e: any) =>
          e.type === LicenseEntitlementType.ACCOUNT_VIRTUAL_CONTRIBUTOR
      );

      expect(virtualContributorEntitlement?.limit).toBe(5);
      expect(virtualContributorEntitlement?.enabled).toBe(true);

      // Test scenario: Credential-based higher than baseline for non-space entitlements
      mockCredentialBasedService.getEntitlementIfGranted
        .mockResolvedValueOnce({
          type: LicenseEntitlementType.ACCOUNT_INNOVATION_PACK,
          limit: 8, // Higher than baseline (3)
        })
        .mockResolvedValueOnce(null);

      const testLicense2: ILicense = {
        id: 'test-license-2',
        type: 'account' as any,
        entitlements: [
          {
            id: '1',
            type: LicenseEntitlementType.ACCOUNT_INNOVATION_PACK,
            dataType: LicenseEntitlementDataType.LIMIT,
            limit: 1, // Reset default
            enabled: false,
          },
        ],
      } as ILicense;

      // External first (sets to 8), then baseline (stays 8 since 8 > 3, warning logged)
      result = await (service as any).extendLicensePolicy(
        testLicense2,
        mockAgent,
        mockAccount
      );

      result = await (service as any).applyBaselineLicensePlan(result, {
        id: 'test-account',
        baselineLicensePlan: { innovationPacks: 3 },
      });

      const innovationPackEntitlement = result.entitlements!.find(
        (e: any) => e.type === LicenseEntitlementType.ACCOUNT_INNOVATION_PACK
      );

      expect(innovationPackEntitlement?.limit).toBe(3);
      expect(innovationPackEntitlement?.enabled).toBe(true);

      // Should have applied baseline since external licensing didn't apply in this mock setup

      // Test scenario: Space entitlements always get baseline regardless of external values
      mockCredentialBasedService.getEntitlementIfGranted
        .mockResolvedValueOnce({
          type: LicenseEntitlementType.ACCOUNT_SPACE_FREE,
          limit: 10, // High external value
        })
        .mockResolvedValueOnce(null);

      const testLicense3: ILicense = {
        id: 'test-license-3',
        type: 'account' as any,
        entitlements: [
          {
            id: '1',
            type: LicenseEntitlementType.ACCOUNT_SPACE_FREE,
            dataType: LicenseEntitlementDataType.LIMIT,
            limit: 1, // Reset default
            enabled: false,
          },
        ],
      } as ILicense;

      // External first (sets to 10), then baseline (overwrites to 3 for space entitlements)
      result = await (service as any).extendLicensePolicy(
        testLicense3,
        mockAgent,
        mockAccount
      );

      result = await (service as any).applyBaselineLicensePlan(result, {
        id: 'test-account',
        baselineLicensePlan: { spaceFree: 3 },
      });

      const spaceFreeEntitlement = result.entitlements!.find(
        (e: any) => e.type === LicenseEntitlementType.ACCOUNT_SPACE_FREE
      );

      expect(spaceFreeEntitlement?.limit).toBe(3);
      expect(spaceFreeEntitlement?.enabled).toBe(true);

      // Test scenario: Wingback overrides credential-based before baseline evaluation
      mockAccount.externalSubscriptionID = 'wingback-customer-123';

      mockCredentialBasedService.getEntitlementIfGranted
        .mockResolvedValueOnce({
          type: LicenseEntitlementType.ACCOUNT_VIRTUAL_CONTRIBUTOR,
          limit: 7, // Credential value
        })
        .mockResolvedValueOnce(null);

      mockWingbackService.getEntitlements.mockResolvedValue([
        {
          type: LicenseEntitlementType.ACCOUNT_VIRTUAL_CONTRIBUTOR,
          limit: 12, // Wingback overrides credential
        },
      ]);

      const testLicense4: ILicense = {
        id: 'test-license-4',
        type: 'account' as any,
        entitlements: [
          {
            id: '1',
            type: LicenseEntitlementType.ACCOUNT_VIRTUAL_CONTRIBUTOR,
            dataType: LicenseEntitlementDataType.LIMIT,
            limit: 1, // Reset default
            enabled: false,
          },
        ],
      } as ILicense;

      // External: 1 → 7 (credential) → 12 (Wingback overrides), then baseline: 12 → 12 (12 > 4, kept with warning)
      result = await (service as any).extendLicensePolicy(
        testLicense4,
        mockAgent,
        mockAccount
      );

      result = await (service as any).applyBaselineLicensePlan(result, {
        id: 'test-account',
        baselineLicensePlan: { virtualContributor: 4 },
      });

      const finalVirtualContributorEntitlement = result.entitlements!.find(
        (e: any) =>
          e.type === LicenseEntitlementType.ACCOUNT_VIRTUAL_CONTRIBUTOR
      );

      expect(finalVirtualContributorEntitlement?.limit).toBe(12);
      expect(finalVirtualContributorEntitlement?.enabled).toBe(true);
    });
  });
});
