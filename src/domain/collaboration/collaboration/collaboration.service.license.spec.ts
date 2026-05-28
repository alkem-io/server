import { LicenseEntitlementType } from '@common/enums/license.entitlement.type';
import {
  EntityNotFoundException,
  EntityNotInitializedException,
  RelationshipNotFoundException,
} from '@common/exceptions';
import { LicenseEntitlementNotAvailableException } from '@common/exceptions/license.entitlement.not.available.exception';
import { LicenseEntitlementUnevaluableException } from '@common/exceptions/license.entitlement.unevaluable.exception';
import { Callout } from '@domain/collaboration/callout/callout.entity';
import { LicenseService } from '@domain/common/license/license.service';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { MockType } from '@test/utils/mock.type';
import { repositoryProviderMockFactory } from '@test/utils/repository.provider.mock.factory';
import { Repository } from 'typeorm';
import { Collaboration } from './collaboration.entity';
import { CollaborationLicenseService } from './collaboration.service.license';

const FR_007_MESSAGE = 'Office Docs is not enabled for this Collaboration.';
const COLLABORATION_ID = 'collab-uuid-001';
const CALLOUTS_SET_ID = 'callouts-set-uuid-001';
const CALLOUT_ID = 'callout-uuid-001';

describe('CollaborationLicenseService', () => {
  let service: CollaborationLicenseService;
  let licenseService: LicenseService;
  let collaborationRepository: MockType<Repository<Collaboration>>;
  let calloutRepository: MockType<Repository<Callout>>;

  beforeEach(async () => {
    vi.restoreAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CollaborationLicenseService,
        repositoryProviderMockFactory(Collaboration),
        repositoryProviderMockFactory(Callout),
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(CollaborationLicenseService);
    licenseService = module.get(LicenseService);
    collaborationRepository = module.get(getRepositoryToken(Collaboration));
    calloutRepository = module.get(getRepositoryToken(Callout));
  });

  describe('applyLicensePolicy', () => {
    it('should throw RelationshipNotFoundException when license is missing', async () => {
      const collaboration = {
        id: 'collab-1',
        license: undefined,
      } as any;

      collaborationRepository.findOne!.mockResolvedValue(collaboration);

      await expect(
        service.applyLicensePolicy('collab-1', {} as any)
      ).rejects.toThrow(RelationshipNotFoundException);
    });

    it('should throw RelationshipNotFoundException when entitlements are missing', async () => {
      const collaboration = {
        id: 'collab-1',
        license: { id: 'lic-1', entitlements: undefined },
      } as any;

      collaborationRepository.findOne!.mockResolvedValue(collaboration);

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
          {
            type: LicenseEntitlementType.SPACE_FLAG_OFFICE_DOCUMENTS,
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

      collaborationRepository.findOne!.mockResolvedValue(collaboration);
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
        4
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

      collaborationRepository.findOne!.mockResolvedValue(collaboration);
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

      collaborationRepository.findOne!.mockResolvedValue(collaboration);
      vi.mocked(licenseService.reset).mockReturnValue(license);

      await expect(
        service.applyLicensePolicy('collab-1', parentLicense)
      ).rejects.toThrow(EntityNotInitializedException);
    });
  });

  describe('Office Docs entitlement gate', () => {
    const collabWithEnabledEntitlement = {
      id: COLLABORATION_ID,
      license: {
        id: 'lic-1',
        entitlements: [
          {
            type: LicenseEntitlementType.SPACE_FLAG_OFFICE_DOCUMENTS,
            enabled: true,
          },
        ],
      },
    } as any;

    const collabWithDisabledEntitlement = {
      id: COLLABORATION_ID,
      license: {
        id: 'lic-1',
        entitlements: [
          {
            type: LicenseEntitlementType.SPACE_FLAG_OFFICE_DOCUMENTS,
            enabled: false,
          },
        ],
      },
    } as any;

    describe('ensureOfficeDocsAllowedForCalloutsSet', () => {
      it('should not throw when entitlement is enabled (FR-002, FR-010 debug log)', async () => {
        collaborationRepository.findOne!.mockResolvedValue(
          collabWithEnabledEntitlement
        );
        vi.mocked(licenseService.isEntitlementEnabled).mockReturnValue(true);

        await expect(
          service.ensureOfficeDocsAllowedForCalloutsSet(CALLOUTS_SET_ID)
        ).resolves.toBeUndefined();
      });

      it('should throw LicenseEntitlementNotAvailableException with FR-007 message when entitlement disabled', async () => {
        collaborationRepository.findOne!.mockResolvedValue(
          collabWithDisabledEntitlement
        );
        vi.mocked(licenseService.isEntitlementEnabled).mockReturnValue(false);

        await expect(
          service.ensureOfficeDocsAllowedForCalloutsSet(CALLOUTS_SET_ID)
        ).rejects.toThrow(LicenseEntitlementNotAvailableException);
        await expect(
          service.ensureOfficeDocsAllowedForCalloutsSet(CALLOUTS_SET_ID)
        ).rejects.toThrow(FR_007_MESSAGE);
      });

      it('should throw LicenseEntitlementUnevaluableException when license is null (FR-008 fail-closed)', async () => {
        const collabWithoutLicense = {
          id: COLLABORATION_ID,
          license: null,
        } as any;
        collaborationRepository.findOne!.mockResolvedValue(
          collabWithoutLicense
        );

        await expect(
          service.ensureOfficeDocsAllowedForCalloutsSet(CALLOUTS_SET_ID)
        ).rejects.toThrow(LicenseEntitlementUnevaluableException);
        await expect(
          service.ensureOfficeDocsAllowedForCalloutsSet(CALLOUTS_SET_ID)
        ).rejects.toThrow(FR_007_MESSAGE);
      });

      it('should throw LicenseEntitlementUnevaluableException when entitlements are null (FR-008)', async () => {
        const collabWithoutEntitlements = {
          id: COLLABORATION_ID,
          license: { id: 'lic-1', entitlements: null },
        } as any;
        collaborationRepository.findOne!.mockResolvedValue(
          collabWithoutEntitlements
        );

        await expect(
          service.ensureOfficeDocsAllowedForCalloutsSet(CALLOUTS_SET_ID)
        ).rejects.toThrow(LicenseEntitlementUnevaluableException);
      });

      it('should silently allow when CalloutsSet has no Collaboration parent (template CalloutsSets)', async () => {
        collaborationRepository.findOne!.mockResolvedValue(null);

        await expect(
          service.ensureOfficeDocsAllowedForCalloutsSet(CALLOUTS_SET_ID)
        ).resolves.toBeUndefined();
      });
    });

    describe('ensureOfficeDocsAllowedForCallout', () => {
      it('should resolve target Collaboration via Callout and pass when entitlement enabled', async () => {
        calloutRepository.findOne!.mockResolvedValue({
          id: CALLOUT_ID,
          calloutsSet: { id: CALLOUTS_SET_ID },
        } as any);
        collaborationRepository.findOne!.mockResolvedValue(
          collabWithEnabledEntitlement
        );
        vi.mocked(licenseService.isEntitlementEnabled).mockReturnValue(true);

        await expect(
          service.ensureOfficeDocsAllowedForCallout(CALLOUT_ID)
        ).resolves.toBeUndefined();
      });

      it('should throw EntityNotFoundException when callout does not exist', async () => {
        calloutRepository.findOne!.mockResolvedValue(null);

        await expect(
          service.ensureOfficeDocsAllowedForCallout(CALLOUT_ID)
        ).rejects.toThrow(EntityNotFoundException);
      });

      it('should fail-closed when Callout has no CalloutsSet relation', async () => {
        calloutRepository.findOne!.mockResolvedValue({
          id: CALLOUT_ID,
          calloutsSet: undefined,
        } as any);

        await expect(
          service.ensureOfficeDocsAllowedForCallout(CALLOUT_ID)
        ).rejects.toThrow(LicenseEntitlementUnevaluableException);
      });
    });

    describe('ensureOfficeDocsAllowedForCollaboration', () => {
      it('should pass when entitlement enabled', async () => {
        collaborationRepository.findOne!.mockResolvedValue(
          collabWithEnabledEntitlement
        );
        vi.mocked(licenseService.isEntitlementEnabled).mockReturnValue(true);

        await expect(
          service.ensureOfficeDocsAllowedForCollaboration(COLLABORATION_ID)
        ).resolves.toBeUndefined();
      });

      it('should throw LicenseEntitlementNotAvailableException when entitlement disabled', async () => {
        collaborationRepository.findOne!.mockResolvedValue(
          collabWithDisabledEntitlement
        );
        vi.mocked(licenseService.isEntitlementEnabled).mockReturnValue(false);

        await expect(
          service.ensureOfficeDocsAllowedForCollaboration(COLLABORATION_ID)
        ).rejects.toThrow(LicenseEntitlementNotAvailableException);
      });

      it('should throw EntityNotFoundException when Collaboration not found', async () => {
        collaborationRepository.findOne!.mockResolvedValue(null);

        await expect(
          service.ensureOfficeDocsAllowedForCollaboration(COLLABORATION_ID)
        ).rejects.toThrow(EntityNotFoundException);
      });

      it('should fail-closed when license cannot be loaded (FR-008)', async () => {
        const collabWithoutLicense = {
          id: COLLABORATION_ID,
          license: null,
        } as any;
        collaborationRepository.findOne!.mockResolvedValue(
          collabWithoutLicense
        );

        await expect(
          service.ensureOfficeDocsAllowedForCollaboration(COLLABORATION_ID)
        ).rejects.toThrow(LicenseEntitlementUnevaluableException);
      });
    });
  });
});
