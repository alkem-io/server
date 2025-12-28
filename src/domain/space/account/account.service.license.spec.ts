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
import { IAccountLicensePlan } from '@domain/space/account.license.plan';
import { LogContext } from '@common/enums';
import { ActorService } from '@domain/actor/actor/actor.service';

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
        { provide: ActorService, useValue: {} },
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
    it('should fail when license is undefined', async () => {
      // Act & Assert
      await expect(
        (service as any).applyBaselineLicensePlan(undefined, {} as any)
      ).rejects.toThrow('License with entitlements not found');
    });

    it('should fail when license has no entitlements', async () => {
      // Arrange
      const mockAccount: Partial<IAccount> = {
        id: 'test-account',
        baselineLicensePlan: {} as IAccountLicensePlan,
      };

      // Act & Assert
      await expect(
        (service as any).applyBaselineLicensePlan(
          { id: 'test-license', type: 'account' } as ILicense,
          mockAccount
        )
      ).rejects.toThrow('License with entitlements not found');
    });
    // Unknown entitlement types test
    it('should skip unknown entitlement types and leave them unchanged', async () => {
      // Arrange
      const baselineLicensePlan: IAccountLicensePlan = {
        spaceFree: 1,
        spacePlus: 0,
        spacePremium: 0,
        virtualContributor: 2,
        innovationPacks: 0,
        startingPages: 0,
      };

      const mockAccount: Partial<IAccount> = {
        id: 'test-account',
        baselineLicensePlan,
      };

      const unknownEntitlementType =
        'UNKNOWN_ENTITLEMENT_TYPE' as LicenseEntitlementType;

      const mockLicense: ILicense = {
        id: 'test-license',
        type: 'account' as any,
        entitlements: [
          {
            id: '1',
            type: LicenseEntitlementType.ACCOUNT_SPACE_FREE,
            dataType: LicenseEntitlementDataType.LIMIT,
            limit: 5, // Will be updated to baseline (1)
            enabled: true,
          },
          {
            id: '2',
            type: unknownEntitlementType,
            dataType: LicenseEntitlementDataType.LIMIT,
            limit: 10, // Should remain unchanged
            enabled: true, // Should remain unchanged
          },
        ],
      } as ILicense;

      // Act
      const result = await (service as any).applyBaselineLicensePlan(
        mockLicense,
        mockAccount
      );

      // Assert
      expect(result.entitlements).toHaveLength(2);

      // Known entitlement should be updated
      const spaceFreeEntitlement = result.entitlements!.find(
        (e: any) => e.type === LicenseEntitlementType.ACCOUNT_SPACE_FREE
      );
      expect(spaceFreeEntitlement?.limit).toBe(1); // Updated to baseline
      expect(spaceFreeEntitlement?.enabled).toBe(true);

      // Unknown entitlement should remain unchanged
      const unknownEntitlement = result.entitlements!.find(
        (e: any) => e.type === unknownEntitlementType
      );
      expect(unknownEntitlement?.limit).toBe(10); // Unchanged
      expect(unknownEntitlement?.enabled).toBe(true); // Unchanged
    });

    it('should apply correctly the baseline ', async () => {
      // Arrange
      const baselineLicensePlan: IAccountLicensePlan = {
        spaceFree: 1,
        spacePlus: 0,
        spacePremium: 0,
        virtualContributor: 0,
        innovationPacks: 0,
        startingPages: 5, // This maps to ACCOUNT_INNOVATION_HUB
      };

      const mockAccount: Partial<IAccount> = {
        id: 'test-account',
        baselineLicensePlan,
      };

      const mockLicense = {
        entitlements: [
          {
            id: '2',
            type: LicenseEntitlementType.ACCOUNT_SPACE_FREE,
            dataType: LicenseEntitlementDataType.LIMIT,
            limit: 0, // Will be updated to baseline (1)
            enabled: false,
          },
          {
            id: '3',
            type: LicenseEntitlementType.SPACE_PLUS,
            dataType: LicenseEntitlementDataType.LIMIT,
            limit: 0, // Will be disabled
            enabled: false,
          },
          {
            id: '4',
            type: LicenseEntitlementType.SPACE_PREMIUM,
            dataType: LicenseEntitlementDataType.LIMIT,
            limit: 0, // Will be disabled
            enabled: false,
          },
          {
            id: '1',
            type: LicenseEntitlementType.ACCOUNT_INNOVATION_HUB,
            dataType: LicenseEntitlementDataType.LIMIT,
            limit: 0, // Will be updated to baseline (5)
            enabled: false,
          },
          {
            id: '5',
            type: LicenseEntitlementType.ACCOUNT_INNOVATION_PACK,
            dataType: LicenseEntitlementDataType.LIMIT,
            limit: 0, // Will be disabled
            enabled: false,
          },
          {
            id: '6',
            type: LicenseEntitlementType.ACCOUNT_VIRTUAL_CONTRIBUTOR,
            dataType: LicenseEntitlementDataType.LIMIT,
            limit: 0, // Will be disabled
            enabled: false,
          },
        ],
      } as any;

      // Act
      const result = await (service as any).applyBaselineLicensePlan(
        mockLicense,
        mockAccount
      );

      // Assert
      expect(result.entitlements).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: LicenseEntitlementType.ACCOUNT_INNOVATION_HUB,
            limit: 5,
            enabled: true,
          }),
          expect.objectContaining({
            type: LicenseEntitlementType.ACCOUNT_SPACE_FREE,
            limit: 1,
            enabled: true,
          }),
          expect.objectContaining({
            type: LicenseEntitlementType.SPACE_PLUS,
            limit: 0,
            enabled: false,
          }),
          expect.objectContaining({
            type: LicenseEntitlementType.SPACE_PREMIUM,
            limit: 0,
            enabled: false,
          }),
          expect.objectContaining({
            type: LicenseEntitlementType.ACCOUNT_INNOVATION_PACK,
            limit: 0,
            enabled: false,
          }),
          expect.objectContaining({
            type: LicenseEntitlementType.ACCOUNT_VIRTUAL_CONTRIBUTOR,
            limit: 0,
            enabled: false,
          }),
        ])
      );
    });

    // Empty entitlements array test
    it('should handle empty entitlements array and return license unchanged', async () => {
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
        entitlements: [], // Empty array
      } as any;

      // Act
      const result = await (service as any).applyBaselineLicensePlan(
        mockLicense,
        mockAccount
      );

      // Assert
      expect(result.entitlements).toHaveLength(0);
      expect(result).toBe(mockLicense); // Should return the same license object
    });

    // Mixed known and unknown entitlement types test
    it('should process known entitlements and skip unknown ones in mixed scenario', async () => {
      // Arrange
      const baselineLicensePlan: IAccountLicensePlan = {
        spaceFree: 3,
        spacePlus: 1,
        spacePremium: 0,
        virtualContributor: 5,
        innovationPacks: 2,
        startingPages: 4,
      };

      const mockAccount: Partial<IAccount> = {
        id: 'test-account',
        baselineLicensePlan,
      };

      const unknownEntitlementType1 =
        'UNKNOWN_TYPE_1' as LicenseEntitlementType;
      const unknownEntitlementType2 =
        'UNKNOWN_TYPE_2' as LicenseEntitlementType;

      const mockLicense: ILicense = {
        id: 'test-license',
        type: 'account' as any,
        entitlements: [
          {
            id: '1',
            type: LicenseEntitlementType.ACCOUNT_SPACE_FREE,
            dataType: LicenseEntitlementDataType.LIMIT,
            limit: 1,
            enabled: false,
          },
          {
            id: '2',
            type: unknownEntitlementType1,
            dataType: LicenseEntitlementDataType.LIMIT,
            limit: 99,
            enabled: true,
          },
          {
            id: '3',
            type: LicenseEntitlementType.ACCOUNT_VIRTUAL_CONTRIBUTOR,
            dataType: LicenseEntitlementDataType.LIMIT,
            limit: 2,
            enabled: false,
          },
          {
            id: '4',
            type: unknownEntitlementType2,
            dataType: LicenseEntitlementDataType.LIMIT,
            limit: 88,
            enabled: false,
          },
          {
            id: '5',
            type: LicenseEntitlementType.ACCOUNT_INNOVATION_HUB,
            dataType: LicenseEntitlementDataType.LIMIT,
            limit: 1,
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

      // Known entitlements should be updated to baseline values
      const spaceFreeEntitlement = result.entitlements!.find(
        (e: any) => e.type === LicenseEntitlementType.ACCOUNT_SPACE_FREE
      );
      expect(spaceFreeEntitlement?.limit).toBe(3); // Updated to baseline
      expect(spaceFreeEntitlement?.enabled).toBe(true);

      const virtualContributorEntitlement = result.entitlements!.find(
        (e: any) =>
          e.type === LicenseEntitlementType.ACCOUNT_VIRTUAL_CONTRIBUTOR
      );
      expect(virtualContributorEntitlement?.limit).toBe(5); // Updated to baseline
      expect(virtualContributorEntitlement?.enabled).toBe(true);

      const innovationHubEntitlement = result.entitlements!.find(
        (e: any) => e.type === LicenseEntitlementType.ACCOUNT_INNOVATION_HUB
      );
      expect(innovationHubEntitlement?.limit).toBe(4); // Updated to baseline
      expect(innovationHubEntitlement?.enabled).toBe(true);

      // Unknown entitlements should remain unchanged
      const unknownEntitlement1 = result.entitlements!.find(
        (e: any) => e.type === unknownEntitlementType1
      );
      expect(unknownEntitlement1?.limit).toBe(99); // Unchanged
      expect(unknownEntitlement1?.enabled).toBe(true); // Unchanged

      const unknownEntitlement2 = result.entitlements!.find(
        (e: any) => e.type === unknownEntitlementType2
      );
      expect(unknownEntitlement2?.limit).toBe(88); // Unchanged
      expect(unknownEntitlement2?.enabled).toBe(false); // Unchanged
    });
  });

  describe('addEntitlementsFromCredentials', () => {
    let mockCredentialBasedService: any;
    let mockWingbackService: any;
    let mockCredentials: any[];
    let mockLicense: ILicense;
    const mockAccountId = 'test-account-id';

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

      mockCredentials = [];

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

    it('should fail when license is undefined', async () => {
      // Act & Assert
      await expect(
        (service as any).addEntitlementsFromCredentials(
          undefined,
          mockAccountId,
          mockCredentials
        )
      ).rejects.toThrow('License with entitlements not found');
    });

    it('should fail when license has no entitlements', async () => {
      // Arrange
      const licenseWithoutEntitlements = {
        id: 'test-license',
        type: 'account' as any,
        entitlements: undefined,
      } as ILicense;

      // Act & Assert
      await expect(
        (service as any).addEntitlementsFromCredentials(
          licenseWithoutEntitlements,
          mockAccountId,
          mockCredentials
        )
      ).rejects.toThrow('License with entitlements not found');
    });

    it('should return the correct sum of entitlements, matched by type', async () => {
      // Arrange
      mockLicense = {
        entitlements: [
          {
            type: LicenseEntitlementType.ACCOUNT_VIRTUAL_CONTRIBUTOR,
            limit: 1,
            enabled: true,
          },
          {
            type: LicenseEntitlementType.ACCOUNT_INNOVATION_HUB,
            limit: 0,
            enabled: false,
          },
        ],
      } as any;

      mockCredentialBasedService.getEntitlementIfGranted
        .mockResolvedValueOnce({
          type: LicenseEntitlementType.ACCOUNT_VIRTUAL_CONTRIBUTOR,
          limit: 5,
        })
        .mockResolvedValueOnce(undefined);

      // Act
      const result = await (service as any).addEntitlementsFromCredentials(
        mockLicense,
        mockAccountId,
        mockCredentials
      );

      // Assert
      expect(
        mockCredentialBasedService.getEntitlementIfGranted
      ).toHaveBeenCalledTimes(2);
      expect(
        mockCredentialBasedService.getEntitlementIfGranted
      ).toHaveBeenCalledWith(
        LicenseEntitlementType.ACCOUNT_VIRTUAL_CONTRIBUTOR,
        mockCredentials
      );
      expect(
        mockCredentialBasedService.getEntitlementIfGranted
      ).toHaveBeenCalledWith(
        LicenseEntitlementType.ACCOUNT_INNOVATION_HUB,
        mockCredentials
      );

      const virtualContributorEntitlement = result.entitlements!.find(
        (e: any) =>
          e.type === LicenseEntitlementType.ACCOUNT_VIRTUAL_CONTRIBUTOR
      );
      expect(virtualContributorEntitlement?.limit).toBe(6);
      expect(virtualContributorEntitlement?.enabled).toBe(true);

      const innovationHubEntitlement = result.entitlements!.find(
        (e: any) => e.type === LicenseEntitlementType.ACCOUNT_INNOVATION_HUB
      );
      expect(innovationHubEntitlement?.limit).toBe(0);
      expect(innovationHubEntitlement?.enabled).toBe(false);
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
        const result = await (service as any).applyWingbackEntitlements(
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
        const result = await (service as any).applyWingbackEntitlements(
          mockAccount as any,
          mockLicense
        );

        // Assert
        expect(mockWingbackService.getEntitlements).not.toHaveBeenCalled();
        expect(result).toBe(mockLicense); // Should return original license without changes
      });

      it('License does not have entitlements', async () => {
        // Act
        const result = await (service as any).applyWingbackEntitlements(
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
        const result = await (service as any).applyWingbackEntitlements(
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
        const result = await (service as any).applyWingbackEntitlements(
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
      const result = await (service as any).applyWingbackEntitlements(
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
      const result = await (service as any).applyWingbackEntitlements(
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
      const result = await (service as any).applyWingbackEntitlements(
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
