import { vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { LicenseEntitlementUsageService } from './license.entitlement.usage.service';
import { LicenseEntitlementType } from '@common/enums/license.entitlement.type';
import { Account } from '@domain/space/account/account.entity';
import { ISpace } from '@domain/space/space/space.interface';
import { ILicenseEntitlement } from '@domain/common/license-entitlement/license.entitlement.interface';
import { ILicense } from '@domain/common/license/license.interface';
import {
  EntityNotFoundException,
  RelationshipNotFoundException,
} from '@common/exceptions';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { getEntityManagerToken } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import type { Mocked } from 'vitest';

describe('LicenseEntitlementUsageService', () => {
  let service: LicenseEntitlementUsageService;
  let entityManager: Mocked<EntityManager>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LicenseEntitlementUsageService, MockWinstonProvider],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get<LicenseEntitlementUsageService>(
      LicenseEntitlementUsageService
    );
    entityManager = module.get<EntityManager>(
      getEntityManagerToken('default')
    ) as Mocked<EntityManager>;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getEntitlementUsageForAccount', () => {
    const licenseID = 'test-license-id';

    describe('space entitlements', () => {
      const mockAccount = {
        spaces: [],
        virtualContributors: [],
        innovationHubs: [],
        innovationPacks: [],
      } as unknown as Account;

      it('should throw EntityNotFoundException when account is not found', async () => {
        entityManager.findOne.mockResolvedValue(null);

        await expect(
          service.getEntitlementUsageForAccount(
            licenseID,
            LicenseEntitlementType.ACCOUNT_SPACE_FREE
          )
        ).rejects.toThrow(EntityNotFoundException);

        expect(entityManager.findOne).toHaveBeenCalledWith(Account, {
          loadEagerRelations: false,
          where: { license: { id: licenseID } },
          relations: {
            spaces: {
              license: {
                entitlements: true,
              },
            },
          },
        });
      });

      it('should count ACCOUNT_SPACE_FREE entitlements correctly', async () => {
        const spaces = createMockSpaces([
          {
            entitlements: [
              createMockEntitlement(LicenseEntitlementType.SPACE_FREE, true),
            ],
          },
          {
            entitlements: [
              createMockEntitlement(LicenseEntitlementType.SPACE_PLUS, true),
            ],
          },
          {
            entitlements: [
              createMockEntitlement(LicenseEntitlementType.SPACE_FREE, true),
            ],
          },
        ]);
        mockAccount.spaces = spaces as any;
        entityManager.findOne.mockResolvedValue(mockAccount);

        const result = await service.getEntitlementUsageForAccount(
          licenseID,
          LicenseEntitlementType.ACCOUNT_SPACE_FREE
        );

        expect(result).toBe(2); // Two spaces with FREE as effective entitlement
      });

      it('should count ACCOUNT_SPACE_PLUS entitlements correctly', async () => {
        const spaces = createMockSpaces([
          {
            entitlements: [
              createMockEntitlement(LicenseEntitlementType.SPACE_PLUS, true),
            ],
          },
          {
            entitlements: [
              createMockEntitlement(LicenseEntitlementType.SPACE_PREMIUM, true),
            ],
          },
          {
            entitlements: [
              createMockEntitlement(LicenseEntitlementType.SPACE_PLUS, true),
            ],
          },
        ]);
        mockAccount.spaces = spaces as any;
        entityManager.findOne.mockResolvedValue(mockAccount);

        const result = await service.getEntitlementUsageForAccount(
          licenseID,
          LicenseEntitlementType.ACCOUNT_SPACE_PLUS
        );

        expect(result).toBe(2); // Two spaces with PLUS as effective entitlement
      });

      it('should count ACCOUNT_SPACE_PREMIUM entitlements correctly', async () => {
        const spaces = createMockSpaces([
          {
            entitlements: [
              createMockEntitlement(LicenseEntitlementType.SPACE_PREMIUM, true),
            ],
          },
          {
            entitlements: [
              createMockEntitlement(LicenseEntitlementType.SPACE_PLUS, true),
            ],
          },
          {
            entitlements: [
              createMockEntitlement(LicenseEntitlementType.SPACE_PREMIUM, true),
            ],
          },
        ]);
        mockAccount.spaces = spaces as any;
        entityManager.findOne.mockResolvedValue(mockAccount);

        const result = await service.getEntitlementUsageForAccount(
          licenseID,
          LicenseEntitlementType.ACCOUNT_SPACE_PREMIUM
        );

        expect(result).toBe(2); // Two spaces with PREMIUM as effective entitlement
      });

      it('should handle spaces with multiple entitlements using priority order', async () => {
        const spaces = createMockSpaces([
          {
            entitlements: [
              createMockEntitlement(LicenseEntitlementType.SPACE_FREE, true),
              createMockEntitlement(LicenseEntitlementType.SPACE_PLUS, true),
              createMockEntitlement(LicenseEntitlementType.SPACE_PREMIUM, true),
            ],
          },
          {
            entitlements: [
              createMockEntitlement(LicenseEntitlementType.SPACE_FREE, true),
              createMockEntitlement(LicenseEntitlementType.SPACE_PLUS, true),
            ],
          },
          {
            entitlements: [
              createMockEntitlement(LicenseEntitlementType.SPACE_FREE, true),
            ],
          },
        ]);
        mockAccount.spaces = spaces as any;
        entityManager.findOne.mockResolvedValue(mockAccount);

        const premiumResult = await service.getEntitlementUsageForAccount(
          licenseID,
          LicenseEntitlementType.ACCOUNT_SPACE_PREMIUM
        );
        const plusResult = await service.getEntitlementUsageForAccount(
          licenseID,
          LicenseEntitlementType.ACCOUNT_SPACE_PLUS
        );
        const freeResult = await service.getEntitlementUsageForAccount(
          licenseID,
          LicenseEntitlementType.ACCOUNT_SPACE_FREE
        );

        // First space (Premium takes priority)
        expect(premiumResult).toBe(1);
        // Second space (Plus takes priority over Free)
        expect(plusResult).toBe(1);
        // Third space (Only Free available)
        expect(freeResult).toBe(1);
      });

      it('should handle disabled entitlements correctly', async () => {
        const spaces = createMockSpaces([
          {
            entitlements: [
              createMockEntitlement(
                LicenseEntitlementType.SPACE_PREMIUM,
                false
              ), // disabled
              createMockEntitlement(LicenseEntitlementType.SPACE_PLUS, true), // enabled
            ],
          },
          {
            entitlements: [
              createMockEntitlement(LicenseEntitlementType.SPACE_FREE, false), // disabled
            ],
          },
        ]);
        mockAccount.spaces = spaces as any;
        entityManager.findOne.mockResolvedValue(mockAccount);

        const plusResult = await service.getEntitlementUsageForAccount(
          licenseID,
          LicenseEntitlementType.ACCOUNT_SPACE_PLUS
        );
        const freeResult = await service.getEntitlementUsageForAccount(
          licenseID,
          LicenseEntitlementType.ACCOUNT_SPACE_FREE
        );

        expect(plusResult).toBe(1); // First space has enabled PLUS
        expect(freeResult).toBe(0); // Second space has disabled FREE
      });

      it('should return 0 for spaces with no valid entitlements', async () => {
        const spaces = createMockSpaces([
          { entitlements: [] },
          {
            entitlements: [
              createMockEntitlement(LicenseEntitlementType.SPACE_FREE, false),
              createMockEntitlement(LicenseEntitlementType.SPACE_PLUS, false),
            ],
          },
        ]);
        mockAccount.spaces = spaces as any;
        entityManager.findOne.mockResolvedValue(mockAccount);

        const result = await service.getEntitlementUsageForAccount(
          licenseID,
          LicenseEntitlementType.ACCOUNT_SPACE_FREE
        );

        expect(result).toBe(0);
      });
    });

    describe('non-space entitlements', () => {
      it('should count ACCOUNT_VIRTUAL_CONTRIBUTOR correctly', async () => {
        const mockAccount = {
          virtualContributors: [{}, {}, {}], // 3 virtual contributors
        } as unknown as Account;
        entityManager.findOne.mockResolvedValue(mockAccount);

        const result = await service.getEntitlementUsageForAccount(
          licenseID,
          LicenseEntitlementType.ACCOUNT_VIRTUAL_CONTRIBUTOR
        );

        expect(result).toBe(3);
        expect(entityManager.findOne).toHaveBeenCalledWith(Account, {
          loadEagerRelations: false,
          where: { license: { id: licenseID } },
          relations: { virtualContributors: true },
        });
      });

      it('should count ACCOUNT_INNOVATION_HUB correctly', async () => {
        const mockAccount = {
          innovationHubs: [{}, {}], // 2 innovation hubs
        } as unknown as Account;
        entityManager.findOne.mockResolvedValue(mockAccount);

        const result = await service.getEntitlementUsageForAccount(
          licenseID,
          LicenseEntitlementType.ACCOUNT_INNOVATION_HUB
        );

        expect(result).toBe(2);
      });

      it('should count ACCOUNT_INNOVATION_PACK correctly', async () => {
        const mockAccount = {
          innovationPacks: [{}], // 1 innovation pack
        } as unknown as Account;
        entityManager.findOne.mockResolvedValue(mockAccount);

        const result = await service.getEntitlementUsageForAccount(
          licenseID,
          LicenseEntitlementType.ACCOUNT_INNOVATION_PACK
        );

        expect(result).toBe(1);
      });
    });

    it('should throw RelationshipNotFoundException for unexpected entitlement type', async () => {
      const mockAccount = {} as Account;
      entityManager.findOne.mockResolvedValue(mockAccount);

      await expect(
        service.getEntitlementUsageForAccount(
          licenseID,
          'INVALID_TYPE' as LicenseEntitlementType
        )
      ).rejects.toThrow(RelationshipNotFoundException);
    });
  });

  describe('getSpaceEffectiveEntitlementLevel', () => {
    it('should return SPACE_PREMIUM when premium entitlement is enabled', () => {
      const space = createMockSpace({
        entitlements: [
          createMockEntitlement(LicenseEntitlementType.SPACE_FREE, true),
          createMockEntitlement(LicenseEntitlementType.SPACE_PLUS, true),
          createMockEntitlement(LicenseEntitlementType.SPACE_PREMIUM, true),
        ],
      });

      const result = (service as any).getSpaceEffectiveEntitlementLevel(space);

      expect(result).toBe(LicenseEntitlementType.SPACE_PREMIUM);
    });

    it('should return SPACE_PLUS when only plus and free are enabled', () => {
      const space = createMockSpace({
        entitlements: [
          createMockEntitlement(LicenseEntitlementType.SPACE_FREE, true),
          createMockEntitlement(LicenseEntitlementType.SPACE_PLUS, true),
          createMockEntitlement(LicenseEntitlementType.SPACE_PREMIUM, false),
        ],
      });

      const result = (service as any).getSpaceEffectiveEntitlementLevel(space);

      expect(result).toBe(LicenseEntitlementType.SPACE_PLUS);
    });

    it('should return SPACE_FREE when only free is enabled', () => {
      const space = createMockSpace({
        entitlements: [
          createMockEntitlement(LicenseEntitlementType.SPACE_FREE, true),
          createMockEntitlement(LicenseEntitlementType.SPACE_PLUS, false),
          createMockEntitlement(LicenseEntitlementType.SPACE_PREMIUM, false),
        ],
      });

      const result = (service as any).getSpaceEffectiveEntitlementLevel(space);

      expect(result).toBe(LicenseEntitlementType.SPACE_FREE);
    });

    it('should return null when no entitlements are enabled', () => {
      const space = createMockSpace({
        entitlements: [
          createMockEntitlement(LicenseEntitlementType.SPACE_FREE, false),
          createMockEntitlement(LicenseEntitlementType.SPACE_PLUS, false),
          createMockEntitlement(LicenseEntitlementType.SPACE_PREMIUM, false),
        ],
      });

      const result = (service as any).getSpaceEffectiveEntitlementLevel(space);

      expect(result).toBeNull();
    });

    it('should return null when no entitlements exist', () => {
      const space = createMockSpace({ entitlements: [] });

      const result = (service as any).getSpaceEffectiveEntitlementLevel(space);

      expect(result).toBeNull();
    });

    it('should throw RelationshipNotFoundException when license entitlements are missing', () => {
      const space = {
        id: 'test-space-id',
        license: null,
      } as unknown as ISpace;

      expect(() =>
        (service as any).getSpaceEffectiveEntitlementLevel(space)
      ).toThrow(RelationshipNotFoundException);
    });

    it('should throw RelationshipNotFoundException when license is missing', () => {
      const space = {
        id: 'test-space-id',
        license: {
          entitlements: undefined,
        },
      } as unknown as ISpace;

      expect(() =>
        (service as any).getSpaceEffectiveEntitlementLevel(space)
      ).toThrow(RelationshipNotFoundException);
    });
  });

  describe('hasMatchingLicenseEntitlement', () => {
    it('should return true when entitlement exists and is enabled', () => {
      const space = createMockSpace({
        entitlements: [
          createMockEntitlement(LicenseEntitlementType.SPACE_PREMIUM, true),
        ],
      });

      const result = (service as any).hasMatchingLicenseEntitlement(
        space,
        LicenseEntitlementType.SPACE_PREMIUM
      );

      expect(result).toBe(true);
    });

    it('should return false when entitlement exists but is disabled', () => {
      const space = createMockSpace({
        entitlements: [
          createMockEntitlement(LicenseEntitlementType.SPACE_PREMIUM, false),
        ],
      });

      const result = (service as any).hasMatchingLicenseEntitlement(
        space,
        LicenseEntitlementType.SPACE_PREMIUM
      );

      expect(result).toBe(false);
    });

    it('should return false when entitlement does not exist', () => {
      const space = createMockSpace({
        entitlements: [
          createMockEntitlement(LicenseEntitlementType.SPACE_FREE, true),
        ],
      });

      const result = (service as any).hasMatchingLicenseEntitlement(
        space,
        LicenseEntitlementType.SPACE_PREMIUM
      );

      expect(result).toBe(false);
    });
  });

  // Helper functions
  function createMockEntitlement(
    type: LicenseEntitlementType,
    enabled: boolean
  ): ILicenseEntitlement {
    return {
      type,
      enabled,
    } as ILicenseEntitlement;
  }

  function createMockSpace(options: {
    entitlements: ILicenseEntitlement[];
  }): ISpace {
    return {
      id: `space-${Math.random()}`,
      license: {
        entitlements: options.entitlements,
      } as ILicense,
    } as ISpace;
  }

  function createMockSpaces(
    spacesConfig: Array<{ entitlements: ILicenseEntitlement[] }>
  ): ISpace[] {
    return spacesConfig.map(config => createMockSpace(config));
  }
});
