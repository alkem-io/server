import { LicenseEntitlementDataType } from '@common/enums/license.entitlement.data.type';
import { LicenseEntitlementType } from '@common/enums/license.entitlement.type';
import { RoleSetLicenseService } from '@domain/access/role-set/role.set.service.license';
import { LicenseEntitlementService } from '@domain/common/license-entitlement/license.entitlement.service';
import { Test, TestingModule } from '@nestjs/testing';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mocked } from 'vitest';
import { PlatformService } from './platform.service';
import { PlatformLicenseService } from './platform.service.license';

describe('PlatformLicenseService', () => {
  let service: PlatformLicenseService;
  let platformService: Mocked<PlatformService>;
  let roleSetLicenseService: Mocked<RoleSetLicenseService>;
  let licenseEntitlementService: Mocked<LicenseEntitlementService>;

  beforeEach(async () => {
    vi.restoreAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [PlatformLicenseService, MockWinstonProvider],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(PlatformLicenseService);
    platformService = module.get(PlatformService) as Mocked<PlatformService>;
    roleSetLicenseService = module.get(
      RoleSetLicenseService
    ) as Mocked<RoleSetLicenseService>;
    licenseEntitlementService = module.get(
      LicenseEntitlementService
    ) as Mocked<LicenseEntitlementService>;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('applyLicensePolicy', () => {
    it('should get roleSet and apply license policy with platform entitlements', async () => {
      const roleSet = { id: 'rs-1' } as any;
      const licenses = [{ id: 'lic-1' }] as any;
      const entitlement = {
        type: LicenseEntitlementType.SPACE_FLAG_VIRTUAL_CONTRIBUTOR_ACCESS,
        dataType: LicenseEntitlementDataType.FLAG,
        limit: 999,
        enabled: true,
      } as any;

      platformService.getRoleSetOrFail.mockResolvedValue(roleSet);
      licenseEntitlementService.createEntitlement.mockReturnValue(entitlement);
      roleSetLicenseService.applyLicensePolicy.mockResolvedValue(licenses);

      const result = await service.applyLicensePolicy();

      expect(platformService.getRoleSetOrFail).toHaveBeenCalled();
      expect(licenseEntitlementService.createEntitlement).toHaveBeenCalledWith(
        expect.objectContaining({
          type: LicenseEntitlementType.SPACE_FLAG_VIRTUAL_CONTRIBUTOR_ACCESS,
          dataType: LicenseEntitlementDataType.FLAG,
          limit: 999,
          enabled: true,
        })
      );
      expect(roleSetLicenseService.applyLicensePolicy).toHaveBeenCalledWith(
        'rs-1',
        [entitlement]
      );
      expect(result).toEqual(licenses);
    });
  });
});
