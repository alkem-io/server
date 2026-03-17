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
import { CollaborationService } from './collaboration.service';
import { CollaborationLicenseService } from './collaboration.service.license';

describe('CollaborationLicenseService', () => {
  let service: CollaborationLicenseService;
  let collaborationService: CollaborationService;
  let licenseService: LicenseService;

  beforeEach(async () => {
    vi.restoreAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CollaborationLicenseService,
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(CollaborationLicenseService);
    collaborationService = module.get(CollaborationService);
    licenseService = module.get(LicenseService);
  });

  describe('applyLicensePolicy', () => {
    it('should throw RelationshipNotFoundException when license is missing', async () => {
      const collaboration = {
        id: 'collab-1',
        license: undefined,
      } as any;

      vi.mocked(collaborationService.getCollaborationOrFail).mockResolvedValue(
        collaboration
      );

      await expect(
        service.applyLicensePolicy('collab-1', {} as any)
      ).rejects.toThrow(RelationshipNotFoundException);
    });

    it('should throw RelationshipNotFoundException when entitlements are missing', async () => {
      const collaboration = {
        id: 'collab-1',
        license: { id: 'lic-1', entitlements: undefined },
      } as any;

      vi.mocked(collaborationService.getCollaborationOrFail).mockResolvedValue(
        collaboration
      );

      await expect(
        service.applyLicensePolicy('collab-1', {} as any)
      ).rejects.toThrow(RelationshipNotFoundException);
    });

    it('should reset license and apply entitlements from parent', async () => {
      const license = {
        id: 'lic-1',
        entitlements: [
          {
            type: LicenseEntitlementType.SPACE_FLAG_SAVE_AS_TEMPLATE,
            enabled: false,
          },
          {
            type: LicenseEntitlementType.SPACE_FLAG_WHITEBOARD_MULTI_USER,
            enabled: false,
          },
          {
            type: LicenseEntitlementType.SPACE_FLAG_MEMO_MULTI_USER,
            enabled: false,
          },
        ],
      } as any;
      const collaboration = {
        id: 'collab-1',
        license,
      } as any;
      const parentLicense = {
        id: 'parent-lic',
        entitlements: [
          {
            type: LicenseEntitlementType.SPACE_FLAG_SAVE_AS_TEMPLATE,
            enabled: true,
          },
        ],
      } as any;

      vi.mocked(collaborationService.getCollaborationOrFail).mockResolvedValue(
        collaboration
      );
      vi.mocked(licenseService.reset).mockReturnValue(license);
      vi.mocked(licenseService.findAndCopyParentEntitlement).mockImplementation(
        () => {}
      );

      const result = await service.applyLicensePolicy(
        'collab-1',
        parentLicense
      );

      expect(licenseService.reset).toHaveBeenCalledWith(license);
      expect(licenseService.findAndCopyParentEntitlement).toHaveBeenCalledTimes(
        3
      );
      expect(result).toContain(license);
    });

    it('should throw EntityNotInitializedException for unknown entitlement type', async () => {
      const license = {
        id: 'lic-1',
        entitlements: [{ type: 'UNKNOWN_TYPE', enabled: false }],
      } as any;
      const collaboration = {
        id: 'collab-1',
        license,
      } as any;
      const parentLicense = {
        id: 'parent-lic',
        entitlements: [],
      } as any;

      vi.mocked(collaborationService.getCollaborationOrFail).mockResolvedValue(
        collaboration
      );
      vi.mocked(licenseService.reset).mockReturnValue(license);

      await expect(
        service.applyLicensePolicy('collab-1', parentLicense)
      ).rejects.toThrow(EntityNotInitializedException);
    });

    it('should throw EntityNotInitializedException when parent license entitlements are missing', async () => {
      const license = {
        id: 'lic-1',
        entitlements: [
          {
            type: LicenseEntitlementType.SPACE_FLAG_SAVE_AS_TEMPLATE,
            enabled: false,
          },
        ],
      } as any;
      const collaboration = {
        id: 'collab-1',
        license,
      } as any;
      const parentLicense = {
        id: 'parent-lic',
        entitlements: undefined,
      } as any;

      vi.mocked(collaborationService.getCollaborationOrFail).mockResolvedValue(
        collaboration
      );
      vi.mocked(licenseService.reset).mockReturnValue(license);

      await expect(
        service.applyLicensePolicy('collab-1', parentLicense)
      ).rejects.toThrow(EntityNotInitializedException);
    });
  });
});
