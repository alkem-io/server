import { LicenseEntitlementDataType } from '@common/enums/license.entitlement.data.type';
import { LicenseEntitlementType } from '@common/enums/license.entitlement.type';
import { LicenseType } from '@common/enums/license.type';
import { EntityNotFoundException } from '@common/exceptions';
import { LicenseEntitlementNotSupportedException } from '@common/exceptions/license.entitlement.not.supported';
import { Test, TestingModule } from '@nestjs/testing';
import { LicenseEntitlementUsageService } from '@services/infrastructure/license-entitlement-usage/license.entitlement.usage.service';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mock } from 'vitest';
import { ILicense } from '../license/license.interface';
import { LicenseEntitlement } from './license.entitlement.entity';
import { ILicenseEntitlement } from './license.entitlement.interface';
import { LicenseEntitlementService } from './license.entitlement.service';
import { mockDrizzleProvider } from '@test/utils/drizzle.mock.factory';
import { DRIZZLE } from '@config/drizzle/drizzle.constants';

describe('LicenseEntitlementService', () => {
  let service: LicenseEntitlementService;
  let db: any;
  let usageService: LicenseEntitlementUsageService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LicenseEntitlementService,
        mockDrizzleProvider,
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(LicenseEntitlementService);
    db = module.get(DRIZZLE);
    usageService = module.get(LicenseEntitlementUsageService);
  });

  describe('createEntitlement', () => {
    it('should create an entitlement with all provided fields', () => {
      const result = service.createEntitlement({
        limit: 5,
        enabled: true,
        type: LicenseEntitlementType.ACCOUNT_SPACE_FREE,
        dataType: LicenseEntitlementDataType.LIMIT,
      });

      expect(result.limit).toBe(5);
      expect(result.enabled).toBe(true);
      expect(result.type).toBe(LicenseEntitlementType.ACCOUNT_SPACE_FREE);
      expect(result.dataType).toBe(LicenseEntitlementDataType.LIMIT);
    });
  });

  describe('getEntitlementOrFail', () => {
    it('should return entitlement when found', async () => {
      const entitlement = { id: 'ent-1' } as LicenseEntitlement;
      db.query.licenseEntitlements.findFirst.mockResolvedValueOnce(entitlement);

      const result = await service.getEntitlementOrFail('ent-1');

      expect(result).toBe(entitlement);
    });

    it('should throw EntityNotFoundException when not found', async () => {

      await expect(service.getEntitlementOrFail('missing')).rejects.toThrow(
        EntityNotFoundException
      );
    });
  });

  describe('deleteEntitlementOrFail', () => {
    it('should remove entitlement and preserve original id', async () => {
      const entitlement = { id: 'ent-1', limit: 5 } as LicenseEntitlement;
      db.query.licenseEntitlements.findFirst.mockResolvedValueOnce(entitlement);

      const result = await service.deleteEntitlementOrFail('ent-1');

      expect(result.id).toBe('ent-1');
    });
  });

  describe('reset', () => {
    it('should set limit to 0 and enabled to false', () => {
      const entitlement = {
        limit: 10,
        enabled: true,
      } as ILicenseEntitlement;

      const result = service.reset(entitlement);

      expect(result.limit).toBe(0);
      expect(result.enabled).toBe(false);
    });
  });

  describe('getEntitlementUsage', () => {
    it('should return -1 for FLAG data type entitlements', async () => {
      const entitlement = {
        id: 'ent-1',
        dataType: LicenseEntitlementDataType.FLAG,
        license: { id: 'lic-1', type: LicenseType.ACCOUNT },
      } as unknown as LicenseEntitlement;
      db.query.licenseEntitlements.findFirst.mockResolvedValueOnce(entitlement);

      const result = await service.getEntitlementUsage('ent-1');

      expect(result).toBe(-1);
    });
  });

  describe('getEntitlementUsageUsingEntities', () => {
    it('should call usage service for ACCOUNT license type', async () => {
      const license = {
        id: 'lic-1',
        type: LicenseType.ACCOUNT,
      } as ILicense;
      const entitlement = {
        type: LicenseEntitlementType.ACCOUNT_SPACE_FREE,
      } as ILicenseEntitlement;

      (usageService.getEntitlementUsageForAccount as Mock).mockResolvedValue(3);

      const result = await service.getEntitlementUsageUsingEntities(
        license,
        entitlement
      );

      expect(result).toBe(3);
      expect(usageService.getEntitlementUsageForAccount).toHaveBeenCalledWith(
        'lic-1',
        LicenseEntitlementType.ACCOUNT_SPACE_FREE
      );
    });

    it('should throw EntityNotFoundException for unsupported license type', async () => {
      const license = {
        id: 'lic-1',
        type: 'unknown-type' as any,
      } as ILicense;
      const entitlement = {} as ILicenseEntitlement;

      await expect(
        service.getEntitlementUsageUsingEntities(license, entitlement)
      ).rejects.toThrow(EntityNotFoundException);
    });
  });

  describe('isEntitlementAvailableUsingEntities', () => {
    it('should return enabled flag for FLAG data type', async () => {
      const license = {
        id: 'lic-1',
        type: LicenseType.ACCOUNT,
      } as ILicense;
      const entitlement = {
        dataType: LicenseEntitlementDataType.FLAG,
        enabled: true,
      } as ILicenseEntitlement;

      const result = await service.isEntitlementAvailableUsingEntities(
        license,
        entitlement
      );

      expect(result).toBe(true);
    });

    it('should return false for disabled FLAG data type', async () => {
      const license = {
        id: 'lic-1',
        type: LicenseType.ACCOUNT,
      } as ILicense;
      const entitlement = {
        dataType: LicenseEntitlementDataType.FLAG,
        enabled: false,
      } as ILicenseEntitlement;

      const result = await service.isEntitlementAvailableUsingEntities(
        license,
        entitlement
      );

      expect(result).toBe(false);
    });

    it('should return true when usage is below limit for ACCOUNT type', async () => {
      const license = {
        id: 'lic-1',
        type: LicenseType.ACCOUNT,
      } as ILicense;
      const entitlement = {
        dataType: LicenseEntitlementDataType.LIMIT,
        type: LicenseEntitlementType.ACCOUNT_SPACE_FREE,
        limit: 5,
      } as ILicenseEntitlement;

      (usageService.getEntitlementUsageForAccount as Mock).mockResolvedValue(3);

      const result = await service.isEntitlementAvailableUsingEntities(
        license,
        entitlement
      );

      expect(result).toBe(true);
    });

    it('should return false when usage meets or exceeds limit', async () => {
      const license = {
        id: 'lic-1',
        type: LicenseType.ACCOUNT,
      } as ILicense;
      const entitlement = {
        dataType: LicenseEntitlementDataType.LIMIT,
        type: LicenseEntitlementType.ACCOUNT_SPACE_FREE,
        limit: 3,
      } as ILicenseEntitlement;

      (usageService.getEntitlementUsageForAccount as Mock).mockResolvedValue(3);

      const result = await service.isEntitlementAvailableUsingEntities(
        license,
        entitlement
      );

      expect(result).toBe(false);
    });

    it('should throw LicenseEntitlementNotSupportedException for SPACE license type', async () => {
      const license = {
        id: 'lic-1',
        type: LicenseType.SPACE,
      } as ILicense;
      const entitlement = {
        dataType: LicenseEntitlementDataType.LIMIT,
        type: LicenseEntitlementType.ACCOUNT_SPACE_FREE,
      } as ILicenseEntitlement;

      await expect(
        service.isEntitlementAvailableUsingEntities(license, entitlement)
      ).rejects.toThrow(LicenseEntitlementNotSupportedException);
    });
  });
});
