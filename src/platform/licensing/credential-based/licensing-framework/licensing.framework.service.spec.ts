import { Test, TestingModule } from '@nestjs/testing';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { repositoryProviderMockFactory } from '@test/utils/repository.provider.mock.factory';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MockType } from '@test/utils/mock.type';
import { Repository } from 'typeorm';
import { LicensingFramework } from './licensing.framework.entity';
import { LicensingFrameworkService } from './licensing.framework.service';
import { LicensePlanService } from '@platform/licensing/credential-based/license-plan/license.plan.service';
import { EntityNotFoundException } from '@common/exceptions';
import { EntityNotInitializedException } from '@common/exceptions/entity.not.initialized.exception';
import { ILicensingFramework } from './licensing.framework.interface';
import { vi } from 'vitest';

describe('LicensingFrameworkService', () => {
  let service: LicensingFrameworkService;
  let licensingRepo: MockType<Repository<LicensingFramework>>;
  let licensePlanService: LicensePlanService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LicensingFrameworkService,
        repositoryProviderMockFactory(LicensingFramework),
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(LicensingFrameworkService);
    licensingRepo = module.get(getRepositoryToken(LicensingFramework));
    licensePlanService = module.get(LicensePlanService);
  });

  describe('getLicensingOrFail', () => {
    it('should return the licensing framework when found', async () => {
      const licensing = { id: 'lic-1', plans: [] } as unknown as LicensingFramework;
      licensingRepo.findOne!.mockResolvedValue(licensing);

      const result = await service.getLicensingOrFail('lic-1');

      expect(result).toBe(licensing);
    });

    it('should throw EntityNotFoundException when licensing not found', async () => {
      licensingRepo.findOne!.mockResolvedValue(null);

      await expect(
        service.getLicensingOrFail('missing')
      ).rejects.toThrow(EntityNotFoundException);
    });
  });

  describe('getDefaultLicensingOrFail', () => {
    it('should return the single licensing framework when exactly one exists', async () => {
      const licensing = { id: 'lic-1' } as LicensingFramework;
      licensingRepo.find!.mockResolvedValue([licensing]);

      const result = await service.getDefaultLicensingOrFail();

      expect(result).toBe(licensing);
    });

    it('should throw EntityNotFoundException when no licensing frameworks exist', async () => {
      licensingRepo.find!.mockResolvedValue([]);

      await expect(
        service.getDefaultLicensingOrFail()
      ).rejects.toThrow(EntityNotFoundException);
    });

    it('should throw EntityNotFoundException when multiple licensing frameworks exist', async () => {
      licensingRepo.find!.mockResolvedValue([
        { id: 'lic-1' },
        { id: 'lic-2' },
      ]);

      await expect(
        service.getDefaultLicensingOrFail()
      ).rejects.toThrow(EntityNotFoundException);
    });
  });

  describe('getLicensePlansOrFail', () => {
    it('should return plans when licensing has plans', async () => {
      const plans = [{ id: 'plan-1' }, { id: 'plan-2' }];
      const licensing = { id: 'lic-1', plans } as unknown as LicensingFramework;
      licensingRepo.findOne!.mockResolvedValue(licensing);

      const result = await service.getLicensePlansOrFail('lic-1');

      expect(result).toHaveLength(2);
    });

    it('should throw EntityNotFoundException when plans are undefined', async () => {
      const licensing = {
        id: 'lic-1',
        plans: undefined,
      } as unknown as LicensingFramework;
      licensingRepo.findOne!.mockResolvedValue(licensing);

      await expect(
        service.getLicensePlansOrFail('lic-1')
      ).rejects.toThrow(EntityNotFoundException);
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
      licensingRepo.findOne!.mockResolvedValue(licensing);

      const result = await service.getLicensePlanOrFail('lic-1', 'plan-2');

      expect(result.id).toBe('plan-2');
    });

    it('should throw EntityNotFoundException when plan ID not in plans list', async () => {
      const licensing = {
        id: 'lic-1',
        plans: [{ id: 'plan-1' }],
      } as unknown as LicensingFramework;
      licensingRepo.findOne!.mockResolvedValue(licensing);

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
      licensingRepo.findOne!.mockResolvedValue(licensing);

      const newPlan = { id: 'plan-new', name: 'NewPlan' } as any;
      vi.mocked(licensePlanService.createLicensePlan).mockResolvedValue(
        newPlan
      );
      licensingRepo.save!.mockResolvedValue(licensing);

      const result = await service.createLicensePlan({
        licensingFrameworkID: 'lic-1',
        name: 'NewPlan',
      } as any);

      expect(result).toBe(newPlan);
      expect(licensing.plans).toContain(newPlan);
      expect(licensingRepo.save).toHaveBeenCalledWith(licensing);
    });

    it('should throw EntityNotInitializedException when plans is undefined', async () => {
      const licensing = {
        id: 'lic-1',
        plans: undefined,
      } as unknown as LicensingFramework;
      licensingRepo.findOne!.mockResolvedValue(licensing);

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
      licensingRepo.findOne!.mockResolvedValue(licensing);

      const result = await service.getLicensePolicy('lic-1');

      expect(result).toBe(policy);
    });

    it('should throw EntityNotFoundException when licensePolicy is undefined', async () => {
      const licensing = {
        id: 'lic-1',
        licensePolicy: undefined,
      } as unknown as LicensingFramework;
      licensingRepo.findOne!.mockResolvedValue(licensing);

      await expect(service.getLicensePolicy('lic-1')).rejects.toThrow(
        EntityNotFoundException
      );
    });
  });
});
