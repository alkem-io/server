import { RelationshipNotFoundException } from '@common/exceptions';
import { RoleSetLicenseService } from '@domain/access/role-set/role.set.service.license';
import { LicenseEntitlementService } from '@domain/common/license-entitlement/license.entitlement.service';
import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mock } from 'vitest';
import { OrganizationLookupService } from '../organization-lookup/organization.lookup.service';
import { OrganizationLicenseService } from './organization.service.license';

describe('OrganizationLicenseService', () => {
  let service: OrganizationLicenseService;
  let organizationLookupService: { getOrganizationByIdOrFail: Mock };
  let roleSetLicenseService: { applyLicensePolicy: Mock };
  let licenseEntitlementService: { createEntitlement: Mock };

  beforeEach(async () => {
    vi.restoreAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrganizationLicenseService,
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(OrganizationLicenseService);
    organizationLookupService = module.get(OrganizationLookupService) as any;
    roleSetLicenseService = module.get(RoleSetLicenseService) as any;
    licenseEntitlementService = module.get(LicenseEntitlementService) as any;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('applyLicensePolicy', () => {
    it('should apply license policy to organization roleSet', async () => {
      const mockOrg = {
        id: 'org-1',
        credentials: [{ id: 'cred-1' }],
        roleSet: { id: 'rs-1' },
      };
      const mockEntitlement = { id: 'ent-1', type: 'flag', enabled: false };
      const mockLicenses = [{ id: 'license-1' }];

      organizationLookupService.getOrganizationByIdOrFail.mockResolvedValue(
        mockOrg
      );
      licenseEntitlementService.createEntitlement.mockReturnValue(
        mockEntitlement
      );
      roleSetLicenseService.applyLicensePolicy.mockResolvedValue(mockLicenses);

      const result = await service.applyLicensePolicy('org-1');

      expect(
        organizationLookupService.getOrganizationByIdOrFail
      ).toHaveBeenCalledWith('org-1', expect.any(Object));
      expect(roleSetLicenseService.applyLicensePolicy).toHaveBeenCalledWith(
        'rs-1',
        [mockEntitlement]
      );
      expect(result).toEqual(mockLicenses);
    });

    it('should throw RelationshipNotFoundException when credentials missing', async () => {
      const mockOrg = {
        id: 'org-1',
        credentials: undefined,
        roleSet: { id: 'rs-1' },
      };
      organizationLookupService.getOrganizationByIdOrFail.mockResolvedValue(
        mockOrg
      );

      await expect(service.applyLicensePolicy('org-1')).rejects.toThrow(
        RelationshipNotFoundException
      );
    });

    it('should throw RelationshipNotFoundException when roleSet missing', async () => {
      const mockOrg = {
        id: 'org-1',
        credentials: [{ id: 'cred-1' }],
        roleSet: undefined,
      };
      organizationLookupService.getOrganizationByIdOrFail.mockResolvedValue(
        mockOrg
      );

      await expect(service.applyLicensePolicy('org-1')).rejects.toThrow(
        RelationshipNotFoundException
      );
    });
  });
});
