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
import { AgentService } from '@domain/agent/agent/agent.service';

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
        { provide: AgentService, useValue: {} },
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
        isEnabled: jest.fn().mockReturnValue(true),
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

  describe('applyWingbackEntitlements', () => {
    let mockCredentialBasedService: any;
    let mockWingbackService: any;
    let mockAccount: Partial<IAccount>;
    let mockLicense: ILicense;

    beforeEach(() => {
      mockCredentialBasedService = {
        getEntitlementIfGranted: jest.fn(),
      };
      mockWingbackService = {
        getEntitlements: jest.fn(),
        isEnabled: jest.fn().mockReturnValue(true),
      };

      service['licensingCredentialBasedService'] = mockCredentialBasedService;
      service['licensingWingbackSubscriptionService'] = mockWingbackService;

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

    describe('should return same license when', () => {
      it('Wingback is not enabled', async () => {
        // Arrange
        mockWingbackService.isEnabled.mockReturnValue(false);

        // Act
        const result = await service.applyWingbackEntitlements(
          mockAccount as any,
          mockLicense
        );

        // Assert
        expect(mockWingbackService.getEntitlements).not.toHaveBeenCalled();
        expect(result).toBe(mockLicense); // Should return original license without changes
      });

      it('Account has no external subscription', async () => {
        // Arrange
        mockAccount.externalSubscriptionID = undefined; // No Wingback subscription

        // Act
        const result = await service.applyWingbackEntitlements(
          mockAccount as any,
          mockLicense
        );

        // Assert
        expect(mockWingbackService.getEntitlements).not.toHaveBeenCalled();
        expect(result).toBe(mockLicense); // Should return original license without changes
      });

      it('License does not have entitlements', async () => {
        // Act
        const result = await service.applyWingbackEntitlements(
          {} as any,
          {} as any
        );

        // Assert
        expect(mockWingbackService.getEntitlements).not.toHaveBeenCalled();
        expect(result).toStrictEqual({}); // Should return original license without changes
      });

      it('Wingback service throws', async () => {
        // Arrange

        mockWingbackService.isEnabled.mockReturnValue(true);

        mockWingbackService.getEntitlements.mockRejectedValue(
          new Error('Wingback service unavailable')
        );
        mockAccount = {
          id: 'test-account',
          externalSubscriptionID: 'wingback-customer-123',
        };
        mockLicense = {
          entitlements: [],
        } as any;

        // Act
        const result = await service.applyWingbackEntitlements(
          mockAccount as any,
          mockLicense
        );

        // Assert
        expect(mockLogger.error).toHaveBeenCalledWith(
          expect.objectContaining({
            message:
              'Skipping Wingback entitlements for Account, since it returned with an error',
            accountId: 'test-account',
            error: expect.any(Error),
          }),
          expect.anything(),
          LogContext.ACCOUNT
        );

        expect(result).toBe(mockLicense); // Should return original license without changes
      });

      it('No entitlements are returned from Wingback', async () => {
        // Arrange
        mockLicense = {
          entitlements: [],
        } as any;
        mockWingbackService.getEntitlements.mockResolvedValue([]);

        // Act
        const result = await service.applyWingbackEntitlements(
          {} as any,
          mockLicense
        );

        // Assert
        expect(result).toBe(mockLicense); // Should return original license without changes
      });
    });

    it('should apply Wingback subscription licensing when external subscription exists', async () => {
      // Arrange
      mockLicense = {
        entitlements: [
          {
            id: '1',
            type: LicenseEntitlementType.ACCOUNT_VIRTUAL_CONTRIBUTOR,
            dataType: LicenseEntitlementDataType.LIMIT,
            limit: 1,
            enabled: true,
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
      mockAccount.externalSubscriptionID = 'wingback-customer-123';

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
      const result = await service.applyWingbackEntitlements(
        mockAccount as any,
        mockLicense
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
      mockLicense = {
        entitlements: [
          {
            id: '1',
            type: LicenseEntitlementType.ACCOUNT_VIRTUAL_CONTRIBUTOR,
            dataType: LicenseEntitlementDataType.LIMIT,
            limit: 5, // Credential-based value
            enabled: true,
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
      mockAccount.externalSubscriptionID = 'wingback-customer-123';

      // Wingback provides a different (higher) value - should override
      mockWingbackService.getEntitlements.mockResolvedValue([
        {
          type: LicenseEntitlementType.ACCOUNT_VIRTUAL_CONTRIBUTOR,
          limit: 15,
        },
      ]);

      // Act
      const result = await service.applyWingbackEntitlements(
        mockAccount as any,
        mockLicense
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
    it('should overwrite ONLY WITH values found in Wingback', async () => {
      // Arrange
      mockAccount.externalSubscriptionID = 'wingback-customer-123';

      // Credential-based licensing only provides innovation pack entitlement
      mockLicense = {
        entitlements: [
          {
            type: LicenseEntitlementType.ACCOUNT_INNOVATION_PACK,
            limit: 2,
            enabled: true,
          },
        ],
      } as ILicense;
      // Wingback only provides virtual contributor entitlement
      mockWingbackService.getEntitlements.mockResolvedValue([
        {
          type: LicenseEntitlementType.ACCOUNT_VIRTUAL_CONTRIBUTOR,
          limit: 8,
        },
      ]);

      // Act
      const result = await service.applyWingbackEntitlements(
        mockAccount as any,
        mockLicense as any
      );

      // Assert
      expect(result.entitlements?.length).toBe(1);
      const innovationPackEntitlement = result.entitlements!.find(
        (e: any) => e.type === LicenseEntitlementType.ACCOUNT_INNOVATION_PACK
      );
      expect(innovationPackEntitlement?.limit).toBe(2); // From credential-based
      expect(innovationPackEntitlement?.enabled).toBe(true);
    });
  });
});
