import { EntityNotFoundException } from '@common/exceptions';
import { EntityNotInitializedException } from '@common/exceptions/entity.not.initialized.exception';
import { Test, TestingModule } from '@nestjs/testing';
import { LicensePlanService } from '@platform/licensing/credential-based/license-plan/license.plan.service';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { vi } from 'vitest';
import { LicensingFramework } from './licensing.framework.entity';
import { LicensingFrameworkService } from './licensing.framework.service';
import { mockDrizzleProvider } from '@test/utils/drizzle.mock.factory';
import { DRIZZLE } from '@config/drizzle/drizzle.constants';

describe('LicensingFrameworkService', () => {
  let service: LicensingFrameworkService;
  let licensePlanService: LicensePlanService;
  let db: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LicensingFrameworkService,
        mockDrizzleProvider,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(LicensingFrameworkService);
    licensePlanService = module.get(LicensePlanService);
    db = module.get(DRIZZLE);
  });

  describe('getLicensingOrFail', () => {
    it('should return the licensing framework when found', async () => {
      const licensing = {
        id: 'lic-1',
        plans: [],
      } as unknown as LicensingFramework;
      db.query.licensingFrameworks.findFirst.mockResolvedValueOnce(licensing);

      const result = await service.getLicensingOrFail('lic-1');

      expect(result).toBe(licensing);
    });

    it('should throw EntityNotFoundException when licensing not found', async () => {

      await expect(service.getLicensingOrFail('missing')).rejects.toThrow(
        EntityNotFoundException
      );
    });
  });

  describe('getDefaultLicensingOrFail', () => {
    it('should return the single licensing framework when exactly one exists', async () => {
      const licensing = { id: 'lic-1' } as LicensingFramework;
      db.query.licensingFrameworks.findMany.mockResolvedValueOnce([licensing]);

      const result = await service.getDefaultLicensingOrFail();

      expect(result).toBe(licensing);
    });

    it('should throw EntityNotFoundException when no licensing frameworks exist', async () => {
      // findMany returns [] by default
      await expect(service.getDefaultLicensingOrFail()).rejects.toThrow(
        EntityNotFoundException
      );
    });

    it('should throw EntityNotFoundException when multiple licensing frameworks exist', async () => {
      db.query.licensingFrameworks.findMany.mockResolvedValueOnce([
        { id: 'lic-1' },
        { id: 'lic-2' },
      ]);

      await expect(service.getDefaultLicensingOrFail()).rejects.toThrow(
        EntityNotFoundException
      );
    });
  });

  describe('getLicensePlansOrFail', () => {
    it('should return plans when licensing has plans', async () => {
      const plans = [{ id: 'plan-1' }, { id: 'plan-2' }];
      const licensing = { id: 'lic-1', plans } as unknown as LicensingFramework;
      db.query.licensingFrameworks.findFirst.mockResolvedValueOnce(licensing);

      const result = await service.getLicensePlansOrFail('lic-1');

      expect(result).toHaveLength(2);
    });

    it('should throw EntityNotFoundException when plans are undefined', async () => {
      const licensing = {
        id: 'lic-1',
        plans: undefined,
      } as unknown as LicensingFramework;
      db.query.licensingFrameworks.findFirst.mockResolvedValueOnce(licensing);

      await expect(service.getLicensePlansOrFail('lic-1')).rejects.toThrow(
        EntityNotFoundException
      );
    });
  });

  describe('getLicensePlanOrFail', () => {
    it('should return the matching plan by ID', async () => {
      const plan1 = { id: 'plan-1', name: 'Free' };
      const plan2 = { id: 'plan-2', name: 'Premium' };
      const licensing = {
        id: 'lic-1',
        plans: [plan1, plan2],
      } as unknown as LicensingFramework;
      db.query.licensingFrameworks.findFirst.mockResolvedValueOnce(licensing);

      const result = await service.getLicensePlanOrFail('lic-1', 'plan-2');

      expect(result.id).toBe('plan-2');
    });

    it('should throw EntityNotFoundException when plan ID not in plans list', async () => {
      const licensing = {
        id: 'lic-1',
        plans: [{ id: 'plan-1' }],
      } as unknown as LicensingFramework;
      db.query.licensingFrameworks.findFirst.mockResolvedValueOnce(licensing);

      await expect(
        service.getLicensePlanOrFail('lic-1', 'non-existent')
      ).rejects.toThrow(EntityNotFoundException);
    });
  });

  describe('createLicensePlan', () => {
    it('should create plan, add to licensing, and save', async () => {
      const licensing = {
        id: 'lic-1',
        plans: [],
      } as unknown as LicensingFramework;
      db.query.licensingFrameworks.findFirst.mockResolvedValueOnce(licensing);
      db.returning.mockResolvedValueOnce([licensing]);

      const newPlan = { id: 'plan-new', name: 'NewPlan' } as any;
      vi.mocked(licensePlanService.createLicensePlan).mockResolvedValue(
        newPlan
      );

      const result = await service.createLicensePlan({
        licensingFrameworkID: 'lic-1',
        name: 'NewPlan',
      } as any);

      expect(result).toBe(newPlan);
      expect(licensing.plans).toContain(newPlan);
    });

    it('should throw EntityNotInitializedException when plans is undefined', async () => {
      const licensing = {
        id: 'lic-1',
        plans: undefined,
      } as unknown as LicensingFramework;
      db.query.licensingFrameworks.findFirst.mockResolvedValueOnce(licensing);

      await expect(
        service.createLicensePlan({
          licensingFrameworkID: 'lic-1',
          name: 'Plan',
        } as any)
      ).rejects.toThrow(EntityNotInitializedException);
    });
  });

  describe('getLicensePolicy', () => {
    it('should return the license policy when present', async () => {
      const policy = { id: 'policy-1', credentialRules: [] };
      const licensing = {
        id: 'lic-1',
        licensePolicy: policy,
      } as unknown as LicensingFramework;
      db.query.licensingFrameworks.findFirst.mockResolvedValueOnce(licensing);

      const result = await service.getLicensePolicy('lic-1');

      expect(result).toBe(policy);
    });

    it('should throw EntityNotFoundException when licensePolicy is undefined', async () => {
      const licensing = {
        id: 'lic-1',
        licensePolicy: undefined,
      } as unknown as LicensingFramework;
      db.query.licensingFrameworks.findFirst.mockResolvedValueOnce(licensing);

      await expect(service.getLicensePolicy('lic-1')).rejects.toThrow(
        EntityNotFoundException
      );
    });
  });
});
