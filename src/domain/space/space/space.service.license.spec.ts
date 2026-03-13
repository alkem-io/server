import { LicenseEntitlementType } from '@common/enums/license.entitlement.type';
import {
  EntityNotInitializedException,
  RelationshipNotFoundException,
} from '@common/exceptions';
import { RoleSetLicenseService } from '@domain/access/role-set/role.set.service.license';
import { CollaborationLicenseService } from '@domain/collaboration/collaboration/collaboration.service.license';
import { LicenseService } from '@domain/common/license/license.service';
import { Test, TestingModule } from '@nestjs/testing';
import { LicensingCredentialBasedService } from '@platform/licensing/credential-based/licensing-credential-based-entitlements-engine/licensing.credential.based.service';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { SpaceService } from './space.service';
import { SpaceLicenseService } from './space.service.license';

describe('SpaceLicenseService', () => {
  let service: SpaceLicenseService;
  let spaceService: SpaceService;
  let licenseService: LicenseService;
  let licenseEngineService: LicensingCredentialBasedService;
  let roleSetLicenseService: RoleSetLicenseService;
  let collaborationLicenseService: CollaborationLicenseService;

  beforeEach(async () => {
    vi.restoreAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [SpaceLicenseService, MockWinstonProvider],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(SpaceLicenseService);
    spaceService = module.get(SpaceService);
    licenseService = module.get(LicenseService);
    licenseEngineService = module.get(LicensingCredentialBasedService);
    roleSetLicenseService = module.get(RoleSetLicenseService);
    collaborationLicenseService = module.get(CollaborationLicenseService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('applyLicensePolicy', () => {
    const createMockSpace = (overrides = {}) => ({
      id: 'space-1',
      subspaces: [],
      credentials: [{ type: 'some-cred' }],
      license: {
        id: 'license-1',
        entitlements: [
          {
            type: LicenseEntitlementType.SPACE_FREE,
            limit: 0,
            enabled: false,
          },
          {
            type: LicenseEntitlementType.SPACE_PLUS,
            limit: 0,
            enabled: false,
          },
          {
            type: LicenseEntitlementType.SPACE_PREMIUM,
            limit: 0,
            enabled: false,
          },
          {
            type: LicenseEntitlementType.SPACE_FLAG_SAVE_AS_TEMPLATE,
            limit: 0,
            enabled: false,
          },
          {
            type: LicenseEntitlementType.SPACE_FLAG_VIRTUAL_CONTRIBUTOR_ACCESS,
            limit: 0,
            enabled: false,
          },
          {
            type: LicenseEntitlementType.SPACE_FLAG_WHITEBOARD_MULTI_USER,
            limit: 0,
            enabled: false,
          },
          {
            type: LicenseEntitlementType.SPACE_FLAG_MEMO_MULTI_USER,
            limit: 0,
            enabled: false,
          },
        ],
      },
      community: {
        roleSet: { id: 'roleset-1' },
      },
      collaboration: { id: 'collab-1' },
      ...overrides,
    });

    it('should apply license policy to space and return licenses', async () => {
      const mockSpace = createMockSpace();
      (spaceService.getSpaceOrFail as any).mockResolvedValue(mockSpace as any);
      (licenseService.reset as any).mockReturnValue(mockSpace.license as any);
      (licenseEngineService.isEntitlementGranted as any).mockResolvedValue(
        true
      );
      (roleSetLicenseService.applyLicensePolicy as any).mockResolvedValue([]);
      (collaborationLicenseService.applyLicensePolicy as any).mockResolvedValue(
        []
      );

      const result = await service.applyLicensePolicy('space-1');

      expect(result.length).toBeGreaterThanOrEqual(1);
      expect(licenseService.reset as any).toHaveBeenCalled();
      expect(
        roleSetLicenseService.applyLicensePolicy as any
      ).toHaveBeenCalledWith('roleset-1', mockSpace.license.entitlements);
      expect(
        collaborationLicenseService.applyLicensePolicy as any
      ).toHaveBeenCalledWith('collab-1', mockSpace.license);
    });

    it('should throw when space is missing required relations', async () => {
      const mockSpace = createMockSpace({
        subspaces: undefined,
        credentials: undefined,
      });
      (spaceService.getSpaceOrFail as any).mockResolvedValue(mockSpace as any);

      await expect(service.applyLicensePolicy('space-1')).rejects.toThrow(
        RelationshipNotFoundException
      );
    });

    it('should throw when license entitlements are missing after reset', async () => {
      const mockSpace = createMockSpace();
      (spaceService.getSpaceOrFail as any).mockResolvedValue(mockSpace as any);
      // After reset, license has no entitlements
      (licenseService.reset as any).mockReturnValue({
        id: 'license-1',
        entitlements: undefined,
      } as any);

      await expect(service.applyLicensePolicy('space-1')).rejects.toThrow(
        EntityNotInitializedException
      );
    });

    it('should recursively apply license to subspaces', async () => {
      const mockSubspace = { id: 'subspace-1' };
      const mockSpace = createMockSpace({ subspaces: [mockSubspace] });

      let callCount = 0;
      (spaceService.getSpaceOrFail as any).mockImplementation(async () => {
        callCount++;
        if (callCount === 1) return mockSpace as any;
        return createMockSpace({ id: 'subspace-1', subspaces: [] }) as any;
      });
      (licenseService.reset as any).mockImplementation(
        (license: any) => license as any
      );
      (licenseEngineService.isEntitlementGranted as any).mockResolvedValue(
        false
      );
      (roleSetLicenseService.applyLicensePolicy as any).mockResolvedValue([]);
      (collaborationLicenseService.applyLicensePolicy as any).mockResolvedValue(
        []
      );

      const result = await service.applyLicensePolicy('space-1');

      // Should have licenses from both parent and subspace
      expect(result.length).toBeGreaterThanOrEqual(2);
    });

    it('should use provided level0SpaceAgent when given', async () => {
      const mockSpace = createMockSpace();
      const mockAgent = { id: 'agent-1' } as any;

      (spaceService.getSpaceOrFail as any).mockResolvedValue(mockSpace as any);
      (licenseService.reset as any).mockReturnValue(mockSpace.license as any);
      (licenseEngineService.isEntitlementGranted as any).mockResolvedValue(
        false
      );
      (roleSetLicenseService.applyLicensePolicy as any).mockResolvedValue([]);
      (collaborationLicenseService.applyLicensePolicy as any).mockResolvedValue(
        []
      );

      await service.applyLicensePolicy('space-1', mockAgent);

      expect(
        licenseEngineService.isEntitlementGranted as any
      ).toHaveBeenCalledWith(expect.any(String), mockAgent);
    });

    it('should enable entitlements when granted by license engine', async () => {
      const mockSpace = createMockSpace();
      (spaceService.getSpaceOrFail as any).mockResolvedValue(mockSpace as any);
      (licenseService.reset as any).mockReturnValue(mockSpace.license as any);
      (licenseEngineService.isEntitlementGranted as any).mockResolvedValue(
        true
      );
      (roleSetLicenseService.applyLicensePolicy as any).mockResolvedValue([]);
      (collaborationLicenseService.applyLicensePolicy as any).mockResolvedValue(
        []
      );

      await service.applyLicensePolicy('space-1');

      for (const entitlement of mockSpace.license.entitlements) {
        expect(entitlement.enabled).toBe(true);
        expect(entitlement.limit).toBe(1);
      }
    });

    it('should not enable entitlements when not granted by license engine', async () => {
      const mockSpace = createMockSpace();
      (spaceService.getSpaceOrFail as any).mockResolvedValue(mockSpace as any);
      (licenseService.reset as any).mockReturnValue(mockSpace.license as any);
      (licenseEngineService.isEntitlementGranted as any).mockResolvedValue(
        false
      );
      (roleSetLicenseService.applyLicensePolicy as any).mockResolvedValue([]);
      (collaborationLicenseService.applyLicensePolicy as any).mockResolvedValue(
        []
      );

      await service.applyLicensePolicy('space-1');

      for (const entitlement of mockSpace.license.entitlements) {
        expect(entitlement.enabled).toBe(false);
        expect(entitlement.limit).toBe(0);
      }
    });

    it('should throw for unknown entitlement type', async () => {
      const mockSpace = createMockSpace();
      mockSpace.license.entitlements = [
        { type: 'unknown-type' as any, limit: 0, enabled: false },
      ];
      (spaceService.getSpaceOrFail as any).mockResolvedValue(mockSpace as any);
      (licenseService.reset as any).mockReturnValue(mockSpace.license as any);

      await expect(service.applyLicensePolicy('space-1')).rejects.toThrow(
        EntityNotInitializedException
      );
    });

    it('should throw when license is undefined in extendLicensePolicy', async () => {
      const mockSpace = createMockSpace();
      mockSpace.license = undefined as any;
      (spaceService.getSpaceOrFail as any).mockResolvedValue(mockSpace as any);

      await expect(service.applyLicensePolicy('space-1')).rejects.toThrow(
        RelationshipNotFoundException
      );
    });
  });
});
