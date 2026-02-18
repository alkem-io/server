import { LicensingCredentialBasedPlanType } from '@common/enums/licensing.credential.based.plan.type';
import { ValidationException } from '@common/exceptions';
import { AccountLookupService } from '@domain/space/account.lookup/account.lookup.service';
import { SpaceService } from '@domain/space/space/space.service';
import { Test, TestingModule } from '@nestjs/testing';
import { getEntityManagerToken } from '@nestjs/typeorm';
import { LicenseIssuerService } from '@platform/licensing/credential-based/license-credential-issuer/license.issuer.service';
import { LicensingFrameworkService } from '@platform/licensing/credential-based/licensing-framework/licensing.framework.service';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mock, vi } from 'vitest';
import { AdminLicensingService } from './admin.licensing.service';

describe('AdminLicensingService', () => {
  let service: AdminLicensingService;
  let licensingFrameworkService: { getLicensePlanOrFail: Mock };
  let licenseIssuerService: {
    assignLicensePlan: Mock;
    revokeLicensePlan: Mock;
  };
  let spaceService: { getSpaceOrFail: Mock };
  let accountLookupService: { getAccountOrFail: Mock };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminLicensingService,
        {
          provide: getEntityManagerToken('default'),
          useValue: { find: vi.fn() },
        },
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(AdminLicensingService);
    licensingFrameworkService = module.get(
      LicensingFrameworkService
    ) as unknown as typeof licensingFrameworkService;
    licenseIssuerService = module.get(
      LicenseIssuerService
    ) as unknown as typeof licenseIssuerService;
    spaceService = module.get(SpaceService) as unknown as typeof spaceService;
    accountLookupService = module.get(
      AccountLookupService
    ) as unknown as typeof accountLookupService;
  });

  describe('assignLicensePlanToSpace', () => {
    it('should throw ValidationException when license plan type is not for spaces', async () => {
      vi.mocked(
        licensingFrameworkService.getLicensePlanOrFail
      ).mockResolvedValue({
        type: LicensingCredentialBasedPlanType.ACCOUNT_PLAN,
      });

      await expect(
        service.assignLicensePlanToSpace(
          { spaceID: 'space-1', licensePlanID: 'lp-1' },
          'licensing-1'
        )
      ).rejects.toThrow(ValidationException);
    });

    it('should assign license plan and return space on success with SPACE_PLAN type', async () => {
      const licensePlan = {
        type: LicensingCredentialBasedPlanType.SPACE_PLAN,
      };
      const space = { id: 'space-1' };
      vi.mocked(
        licensingFrameworkService.getLicensePlanOrFail
      ).mockResolvedValue(licensePlan);
      vi.mocked(spaceService.getSpaceOrFail).mockResolvedValue(space);
      vi.mocked(licenseIssuerService.assignLicensePlan).mockResolvedValue(
        space
      );

      const result = await service.assignLicensePlanToSpace(
        { spaceID: 'space-1', licensePlanID: 'lp-1' },
        'licensing-1'
      );

      // Space IS the Actor - space.id passed as actorId
      expect(licenseIssuerService.assignLicensePlan).toHaveBeenCalledWith(
        'space-1',
        licensePlan,
        'space-1'
      );
      expect(result.id).toBe('space-1');
    });

    it('should accept SPACE_FEATURE_FLAG type as valid for spaces', async () => {
      const space = { id: 'space-1' };
      vi.mocked(
        licensingFrameworkService.getLicensePlanOrFail
      ).mockResolvedValue({
        type: LicensingCredentialBasedPlanType.SPACE_FEATURE_FLAG,
      });
      vi.mocked(spaceService.getSpaceOrFail).mockResolvedValue(space);
      vi.mocked(licenseIssuerService.assignLicensePlan).mockResolvedValue(
        space
      );

      await expect(
        service.assignLicensePlanToSpace(
          { spaceID: 'space-1', licensePlanID: 'lp-1' },
          'licensing-1'
        )
      ).resolves.toBeDefined();
    });
  });

  describe('revokeLicensePlanFromSpace', () => {
    it('should throw ValidationException when license plan type is not for spaces', async () => {
      vi.mocked(
        licensingFrameworkService.getLicensePlanOrFail
      ).mockResolvedValue({
        type: LicensingCredentialBasedPlanType.ACCOUNT_FEATURE_FLAG,
      });

      await expect(
        service.revokeLicensePlanFromSpace(
          { spaceID: 'space-1', licensePlanID: 'lp-1' },
          'licensing-1'
        )
      ).rejects.toThrow(ValidationException);
    });

    it('should revoke license plan and return space on success', async () => {
      const licensePlan = {
        type: LicensingCredentialBasedPlanType.SPACE_PLAN,
      };
      const space = { id: 'space-1' };
      vi.mocked(
        licensingFrameworkService.getLicensePlanOrFail
      ).mockResolvedValue(licensePlan);
      vi.mocked(spaceService.getSpaceOrFail).mockResolvedValue(space);
      vi.mocked(licenseIssuerService.revokeLicensePlan).mockResolvedValue(
        space
      );

      const result = await service.revokeLicensePlanFromSpace(
        { spaceID: 'space-1', licensePlanID: 'lp-1' },
        'licensing-1'
      );

      // Space IS the Actor - space.id passed as actorId
      expect(licenseIssuerService.revokeLicensePlan).toHaveBeenCalledWith(
        'space-1',
        licensePlan,
        'space-1'
      );
      expect(result.id).toBe('space-1');
    });
  });

  describe('assignLicensePlanToAccount', () => {
    it('should throw ValidationException when license plan type is not for accounts', async () => {
      vi.mocked(
        licensingFrameworkService.getLicensePlanOrFail
      ).mockResolvedValue({
        type: LicensingCredentialBasedPlanType.SPACE_PLAN,
      });

      await expect(
        service.assignLicensePlanToAccount(
          { accountID: 'acc-1', licensePlanID: 'lp-1' },
          'licensing-1'
        )
      ).rejects.toThrow(ValidationException);
    });

    it('should assign license plan and return account on success', async () => {
      const licensePlan = {
        type: LicensingCredentialBasedPlanType.ACCOUNT_PLAN,
      };
      const account = { id: 'acc-1', credentials: [{ id: 'cred-1' }] };
      vi.mocked(
        licensingFrameworkService.getLicensePlanOrFail
      ).mockResolvedValue(licensePlan);
      vi.mocked(accountLookupService.getAccountOrFail).mockResolvedValue(
        account
      );
      vi.mocked(licenseIssuerService.assignLicensePlan).mockResolvedValue(
        account
      );

      const result = await service.assignLicensePlanToAccount(
        { accountID: 'acc-1', licensePlanID: 'lp-1' },
        'licensing-1'
      );

      // Account IS the Actor - account.id passed as actorId
      expect(licenseIssuerService.assignLicensePlan).toHaveBeenCalledWith(
        'acc-1',
        licensePlan,
        'acc-1'
      );
      expect(result.id).toBe('acc-1');
    });

    it('should accept ACCOUNT_FEATURE_FLAG type as valid for accounts', async () => {
      vi.mocked(
        licensingFrameworkService.getLicensePlanOrFail
      ).mockResolvedValue({
        type: LicensingCredentialBasedPlanType.ACCOUNT_FEATURE_FLAG,
      });
      vi.mocked(accountLookupService.getAccountOrFail).mockResolvedValue({
        id: 'acc-1',
        credentials: [{ id: 'cred-1' }],
      });
      vi.mocked(licenseIssuerService.assignLicensePlan).mockResolvedValue({
        id: 'acc-1',
      });

      await expect(
        service.assignLicensePlanToAccount(
          { accountID: 'acc-1', licensePlanID: 'lp-1' },
          'licensing-1'
        )
      ).resolves.toBeDefined();
    });
  });

  describe('revokeLicensePlanFromAccount', () => {
    it('should throw ValidationException when license plan type is not for accounts', async () => {
      vi.mocked(
        licensingFrameworkService.getLicensePlanOrFail
      ).mockResolvedValue({
        type: LicensingCredentialBasedPlanType.SPACE_FEATURE_FLAG,
      });

      await expect(
        service.revokeLicensePlanFromAccount(
          { accountID: 'acc-1', licensePlanID: 'lp-1' },
          'licensing-1'
        )
      ).rejects.toThrow(ValidationException);
    });

    it('should revoke license plan and return account on success', async () => {
      const licensePlan = {
        type: LicensingCredentialBasedPlanType.ACCOUNT_PLAN,
      };
      const account = { id: 'acc-1', credentials: [{ id: 'cred-1' }] };
      vi.mocked(
        licensingFrameworkService.getLicensePlanOrFail
      ).mockResolvedValue(licensePlan);
      vi.mocked(accountLookupService.getAccountOrFail).mockResolvedValue(
        account
      );
      vi.mocked(licenseIssuerService.revokeLicensePlan).mockResolvedValue(
        account
      );

      const result = await service.revokeLicensePlanFromAccount(
        { accountID: 'acc-1', licensePlanID: 'lp-1' },
        'licensing-1'
      );

      // Account IS the Actor - account.id passed as actorId
      expect(licenseIssuerService.revokeLicensePlan).toHaveBeenCalledWith(
        'acc-1',
        licensePlan,
        'acc-1'
      );
      expect(result.id).toBe('acc-1');
    });
  });
});
