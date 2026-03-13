import { LicenseEntitlementDataType } from '@common/enums/license.entitlement.data.type';
import { LicenseEntitlementType } from '@common/enums/license.entitlement.type';
import { LicenseType } from '@common/enums/license.type';
import {
  EntityNotFoundException,
  RelationshipNotFoundException,
} from '@common/exceptions';
import { LicenseEntitlementNotAvailableException } from '@common/exceptions/license.entitlement.not.available.exception';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { MockType } from '@test/utils/mock.type';
import { repositoryProviderMockFactory } from '@test/utils/repository.provider.mock.factory';
import { Repository } from 'typeorm';
import { type Mock } from 'vitest';
import { AuthorizationPolicyService } from '../authorization-policy/authorization.policy.service';
import { ILicenseEntitlement } from '../license-entitlement/license.entitlement.interface';
import { LicenseEntitlementService } from '../license-entitlement/license.entitlement.service';
import { License } from './license.entity';
import { ILicense } from './license.interface';
import { LicenseService } from './license.service';

describe('LicenseService', () => {
  let service: LicenseService;
  let licenseRepository: MockType<Repository<License>>;
  let entitlementService: LicenseEntitlementService;
  let _authorizationPolicyService: AuthorizationPolicyService;

  beforeEach(async () => {
    // Mock static License.create to avoid DataSource requirement
    vi.spyOn(License, 'create').mockImplementation((input: any) => {
      const entity = new License();
      Object.assign(entity, input);
      return entity as any;
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LicenseService,
        repositoryProviderMockFactory(License),
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(LicenseService);
    licenseRepository = module.get(getRepositoryToken(License));
    entitlementService = module.get(LicenseEntitlementService);
    _authorizationPolicyService = module.get(AuthorizationPolicyService);
  });

  describe('createLicense', () => {
    it('should create a license with entitlements from input', () => {
      (entitlementService.createEntitlement as Mock).mockReturnValue({
        id: 'ent-1',
        limit: 5,
        enabled: true,
        type: LicenseEntitlementType.ACCOUNT_SPACE_FREE,
        dataType: LicenseEntitlementDataType.LIMIT,
      } as ILicenseEntitlement);

      const result = service.createLicense({
        type: LicenseType.ACCOUNT,
        entitlements: [
          {
            limit: 5,
            enabled: true,
            type: LicenseEntitlementType.ACCOUNT_SPACE_FREE,
            dataType: LicenseEntitlementDataType.LIMIT,
          },
        ],
      });

      expect(result.authorization).toBeDefined();
      expect(result.entitlements).toHaveLength(1);
      expect(entitlementService.createEntitlement).toHaveBeenCalledTimes(1);
    });

    it('should create a license with empty entitlements array', () => {
      const result = service.createLicense({
        type: LicenseType.ACCOUNT,
        entitlements: [],
      });

      expect(result.entitlements).toEqual([]);
    });
  });

  describe('getLicenseOrFail', () => {
    it('should return license when found', async () => {
      const license = { id: 'lic-1' } as License;
      licenseRepository.findOne!.mockResolvedValue(license);

      const result = await service.getLicenseOrFail('lic-1');

      expect(result).toBe(license);
    });

    it('should throw EntityNotFoundException when not found', async () => {
      licenseRepository.findOne!.mockResolvedValue(null);

      await expect(service.getLicenseOrFail('missing')).rejects.toThrow(
        EntityNotFoundException
      );
    });
  });

  describe('isEntitlementEnabled', () => {
    it('should return true when the entitlement is enabled', () => {
      const license = {
        id: 'lic-1',
        entitlements: [
          {
            type: LicenseEntitlementType.ACCOUNT_SPACE_FREE,
            enabled: true,
            limit: 5,
          },
        ],
      } as unknown as ILicense;

      const result = service.isEntitlementEnabled(
        license,
        LicenseEntitlementType.ACCOUNT_SPACE_FREE
      );

      expect(result).toBe(true);
    });

    it('should return false when the entitlement is disabled', () => {
      const license = {
        id: 'lic-1',
        entitlements: [
          {
            type: LicenseEntitlementType.ACCOUNT_SPACE_FREE,
            enabled: false,
            limit: 0,
          },
        ],
      } as unknown as ILicense;

      const result = service.isEntitlementEnabled(
        license,
        LicenseEntitlementType.ACCOUNT_SPACE_FREE
      );

      expect(result).toBe(false);
    });

    it('should throw EntityNotFoundException when entitlement type not found', () => {
      const license = {
        id: 'lic-1',
        entitlements: [],
      } as unknown as ILicense;

      expect(() =>
        service.isEntitlementEnabled(
          license,
          LicenseEntitlementType.ACCOUNT_SPACE_FREE
        )
      ).toThrow(EntityNotFoundException);
    });

    it('should throw EntityNotFoundException when license is undefined', () => {
      expect(() =>
        service.isEntitlementEnabled(
          undefined,
          LicenseEntitlementType.ACCOUNT_SPACE_FREE
        )
      ).toThrow(EntityNotFoundException);
    });
  });

  describe('isEntitlementEnabledOrFail', () => {
    it('should not throw when entitlement is enabled', () => {
      const license = {
        id: 'lic-1',
        entitlements: [
          {
            type: LicenseEntitlementType.ACCOUNT_SPACE_FREE,
            enabled: true,
          },
        ],
      } as unknown as ILicense;

      expect(() =>
        service.isEntitlementEnabledOrFail(
          license,
          LicenseEntitlementType.ACCOUNT_SPACE_FREE
        )
      ).not.toThrow();
    });

    it('should throw LicenseEntitlementNotAvailableException when entitlement is disabled', () => {
      const license = {
        id: 'lic-1',
        entitlements: [
          {
            type: LicenseEntitlementType.ACCOUNT_SPACE_FREE,
            enabled: false,
          },
        ],
      } as unknown as ILicense;

      expect(() =>
        service.isEntitlementEnabledOrFail(
          license,
          LicenseEntitlementType.ACCOUNT_SPACE_FREE
        )
      ).toThrow(LicenseEntitlementNotAvailableException);
    });
  });

  describe('getEntitlementLimit', () => {
    it('should return the limit for the specified entitlement type', () => {
      const license = {
        id: 'lic-1',
        entitlements: [
          {
            type: LicenseEntitlementType.ACCOUNT_SPACE_FREE,
            limit: 10,
            enabled: true,
          },
        ],
      } as unknown as ILicense;

      const result = service.getEntitlementLimit(
        license,
        LicenseEntitlementType.ACCOUNT_SPACE_FREE
      );

      expect(result).toBe(10);
    });

    it('should throw when license has no entitlements loaded', () => {
      const license = {
        id: 'lic-1',
        entitlements: undefined,
      } as unknown as ILicense;

      expect(() =>
        service.getEntitlementLimit(
          license,
          LicenseEntitlementType.ACCOUNT_SPACE_FREE
        )
      ).toThrow(RelationshipNotFoundException);
    });
  });

  describe('reset', () => {
    it('should reset all entitlements to limit 0 and disabled', () => {
      (entitlementService.reset as Mock).mockImplementation((e: any) => {
        e.limit = 0;
        e.enabled = false;
        return e;
      });

      const license = {
        id: 'lic-1',
        entitlements: [
          {
            type: LicenseEntitlementType.ACCOUNT_SPACE_FREE,
            limit: 5,
            enabled: true,
          },
        ],
      } as unknown as ILicense;

      service.reset(license);

      expect(entitlementService.reset).toHaveBeenCalledTimes(1);
      expect(license.entitlements![0].limit).toBe(0);
      expect(license.entitlements![0].enabled).toBe(false);
    });
  });

  describe('findAndCopyParentEntitlement', () => {
    it('should copy limit, enabled, and dataType from matching parent entitlement', () => {
      const childEntitlement = {
        type: LicenseEntitlementType.ACCOUNT_SPACE_FREE,
        limit: 0,
        enabled: false,
        dataType: LicenseEntitlementDataType.LIMIT,
      } as ILicenseEntitlement;

      const parentEntitlements = [
        {
          type: LicenseEntitlementType.ACCOUNT_SPACE_FREE,
          limit: 10,
          enabled: true,
          dataType: LicenseEntitlementDataType.LIMIT,
        },
      ] as ILicenseEntitlement[];

      service.findAndCopyParentEntitlement(
        childEntitlement,
        parentEntitlements
      );

      expect(childEntitlement.limit).toBe(10);
      expect(childEntitlement.enabled).toBe(true);
    });

    it('should throw EntityNotFoundException when parent entitlement not found', () => {
      const childEntitlement = {
        type: LicenseEntitlementType.ACCOUNT_SPACE_FREE,
      } as ILicenseEntitlement;

      expect(() =>
        service.findAndCopyParentEntitlement(childEntitlement, [])
      ).toThrow(EntityNotFoundException);
    });
  });

  describe('removeLicenseOrFail', () => {
    it('should delete entitlements, authorization, and remove license', async () => {
      const license = {
        id: 'lic-1',
        entitlements: [{ id: 'ent-1' }, { id: 'ent-2' }],
        authorization: { id: 'auth-1' },
      } as unknown as License;
      licenseRepository.findOne!.mockResolvedValue(license);
      (entitlementService.deleteEntitlementOrFail as Mock).mockResolvedValue(
        {}
      );
      (_authorizationPolicyService.delete as Mock).mockResolvedValue({});
      licenseRepository.remove!.mockResolvedValue({ ...license } as any);

      const result = await service.removeLicenseOrFail('lic-1');

      expect(entitlementService.deleteEntitlementOrFail).toHaveBeenCalledTimes(
        2
      );
      expect(entitlementService.deleteEntitlementOrFail).toHaveBeenCalledWith(
        'ent-1'
      );
      expect(entitlementService.deleteEntitlementOrFail).toHaveBeenCalledWith(
        'ent-2'
      );
      expect(_authorizationPolicyService.delete).toHaveBeenCalledWith(
        license.authorization
      );
      expect(result.id).toBe('lic-1');
    });

    it('should skip authorization deletion when authorization is undefined', async () => {
      const license = {
        id: 'lic-1',
        entitlements: [],
        authorization: undefined,
      } as unknown as License;
      licenseRepository.findOne!.mockResolvedValue(license);
      licenseRepository.remove!.mockResolvedValue({ ...license } as any);

      await service.removeLicenseOrFail('lic-1');

      expect(_authorizationPolicyService.delete).not.toHaveBeenCalled();
    });

    it('should throw EntityNotFoundException when license not found', async () => {
      licenseRepository.findOne!.mockResolvedValue(null);

      await expect(service.removeLicenseOrFail('missing')).rejects.toThrow(
        EntityNotFoundException
      );
    });
  });

  describe('saveAll', () => {
    it('should save all licenses in chunks', async () => {
      const licenses = [{ id: 'lic-1' }, { id: 'lic-2' }] as ILicense[];
      licenseRepository.save!.mockResolvedValue(licenses);

      await service.saveAll(licenses);

      expect(licenseRepository.save).toHaveBeenCalledWith(licenses, {
        chunk: 100,
      });
    });
  });

  describe('getEntitlements', () => {
    it('should return entitlements when already loaded', async () => {
      const entitlements = [
        { id: 'ent-1', type: LicenseEntitlementType.ACCOUNT_SPACE_FREE },
      ] as ILicenseEntitlement[];
      const license = { id: 'lic-1', entitlements } as unknown as ILicense;

      const result = await service.getEntitlements(license);

      expect(result).toBe(entitlements);
    });

    it('should load entitlements when not loaded', async () => {
      const license = {
        id: 'lic-1',
        entitlements: undefined,
      } as unknown as ILicense;
      const loadedLicense = {
        id: 'lic-1',
        entitlements: [{ id: 'ent-1' }],
      } as unknown as License;
      licenseRepository.findOne!.mockResolvedValue(loadedLicense);

      const result = await service.getEntitlements(license);

      expect(result).toEqual([{ id: 'ent-1' }]);
    });
  });

  describe('getMyLicensePrivilegesOrFail', () => {
    it('should return available entitlement types', async () => {
      const entitlements = [
        { id: 'ent-1', type: LicenseEntitlementType.ACCOUNT_SPACE_FREE },
        {
          id: 'ent-2',
          type: LicenseEntitlementType.SPACE_FLAG_WHITEBOARD_MULTI_USER,
        },
      ] as ILicenseEntitlement[];
      const license = { id: 'lic-1', entitlements } as unknown as ILicense;

      (entitlementService.isEntitlementAvailable as Mock)
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false);

      const result = await service.getMyLicensePrivilegesOrFail(license);

      expect(result).toContain(LicenseEntitlementType.ACCOUNT_SPACE_FREE);
      expect(result).not.toContain(
        LicenseEntitlementType.SPACE_FLAG_WHITEBOARD_MULTI_USER
      );
    });

    it('should load entitlements when not already loaded', async () => {
      const license = {
        id: 'lic-1',
        entitlements: undefined,
      } as unknown as ILicense;
      const loadedLicense = {
        id: 'lic-1',
        entitlements: [
          { id: 'ent-1', type: LicenseEntitlementType.ACCOUNT_SPACE_FREE },
        ],
      } as unknown as License;
      licenseRepository.findOne!.mockResolvedValue(loadedLicense);
      (entitlementService.isEntitlementAvailable as Mock).mockResolvedValue(
        true
      );

      const result = await service.getMyLicensePrivilegesOrFail(license);

      expect(result).toContain(LicenseEntitlementType.ACCOUNT_SPACE_FREE);
    });
  });

  describe('isEntitlementAvailable', () => {
    it('should delegate to entitlement service', async () => {
      const license = {
        id: 'lic-1',
        entitlements: [
          { id: 'ent-1', type: LicenseEntitlementType.ACCOUNT_SPACE_FREE },
        ],
      } as unknown as ILicense;

      (
        entitlementService.isEntitlementAvailableUsingEntities as Mock
      ).mockResolvedValue(true);

      const result = await service.isEntitlementAvailable(
        license,
        LicenseEntitlementType.ACCOUNT_SPACE_FREE
      );

      expect(result).toBe(true);
      expect(
        entitlementService.isEntitlementAvailableUsingEntities
      ).toHaveBeenCalledWith(license, license.entitlements![0]);
    });

    it('should throw when entitlement type not found', async () => {
      const license = {
        id: 'lic-1',
        entitlements: [],
      } as unknown as ILicense;

      await expect(
        service.isEntitlementAvailable(
          license,
          LicenseEntitlementType.ACCOUNT_SPACE_FREE
        )
      ).rejects.toThrow(EntityNotFoundException);
    });
  });
});
