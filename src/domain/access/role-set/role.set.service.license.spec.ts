import { LicenseEntitlementType } from '@common/enums/license.entitlement.type';
import {
  EntityNotInitializedException,
  RelationshipNotFoundException,
} from '@common/exceptions';
import { LicenseService } from '@domain/common/license/license.service';
import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mock } from 'vitest';
import { RoleSetService } from './role.set.service';
import { RoleSetLicenseService } from './role.set.service.license';

describe('RoleSetLicenseService', () => {
  let service: RoleSetLicenseService;
  let licenseService: LicenseService;
  let roleSetService: RoleSetService;

  beforeEach(async () => {
    vi.restoreAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [RoleSetLicenseService, MockCacheManager, MockWinstonProvider],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get<RoleSetLicenseService>(RoleSetLicenseService);
    licenseService = module.get<LicenseService>(LicenseService);
    roleSetService = module.get<RoleSetService>(RoleSetService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('applyLicensePolicy', () => {
    it('should apply license policy and return updated licenses', async () => {
      const mockLicense = {
        id: 'license-1',
        entitlements: [
          {
            type: LicenseEntitlementType.SPACE_FLAG_VIRTUAL_CONTRIBUTOR_ACCESS,
          },
        ],
      } as any;
      const mockRoleSet = {
        id: 'rs-1',
        license: mockLicense,
      } as any;

      (roleSetService.getRoleSetOrFail as Mock).mockResolvedValue(mockRoleSet);
      (licenseService.reset as Mock).mockReturnValue(mockLicense);
      (licenseService.findAndCopyParentEntitlement as Mock).mockImplementation(
        () => {}
      );

      const result = await service.applyLicensePolicy('rs-1', []);

      expect(result).toHaveLength(1);
      expect(result[0]).toBe(mockLicense);
      expect(licenseService.reset).toHaveBeenCalledWith(mockLicense);
    });

    it('should throw when license is not loaded', async () => {
      const mockRoleSet = {
        id: 'rs-1',
        license: undefined,
      } as any;

      (roleSetService.getRoleSetOrFail as Mock).mockResolvedValue(mockRoleSet);

      await expect(service.applyLicensePolicy('rs-1', [])).rejects.toThrow(
        RelationshipNotFoundException
      );
    });

    it('should throw when license entitlements are not loaded', async () => {
      const mockRoleSet = {
        id: 'rs-1',
        license: { id: 'license-1', entitlements: undefined },
      } as any;

      (roleSetService.getRoleSetOrFail as Mock).mockResolvedValue(mockRoleSet);

      await expect(service.applyLicensePolicy('rs-1', [])).rejects.toThrow(
        RelationshipNotFoundException
      );
    });

    it('should throw for unknown entitlement type', async () => {
      const mockLicense = {
        id: 'license-1',
        entitlements: [{ type: 'UNKNOWN_TYPE' as any }],
      } as any;
      const mockRoleSet = {
        id: 'rs-1',
        license: mockLicense,
      } as any;

      (roleSetService.getRoleSetOrFail as Mock).mockResolvedValue(mockRoleSet);
      (licenseService.reset as Mock).mockReturnValue(mockLicense);

      await expect(service.applyLicensePolicy('rs-1', [])).rejects.toThrow(
        EntityNotInitializedException
      );
    });
  });
});
