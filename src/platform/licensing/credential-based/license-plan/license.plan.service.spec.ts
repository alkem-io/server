import { EntityNotFoundException } from '@common/exceptions';
import { Test, TestingModule } from '@nestjs/testing';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { vi } from 'vitest';
import { LicensePlan } from './license.plan.entity';
import { LicensePlanService } from './license.plan.service';
import { mockDrizzleProvider } from '@test/utils/drizzle.mock.factory';
import { DRIZZLE } from '@config/drizzle/drizzle.constants';

describe('LicensePlanService', () => {
  let service: LicensePlanService;
  let db: any;

  beforeEach(async () => {
    vi.spyOn(LicensePlan, 'create').mockImplementation(() => {
      return new LicensePlan() as any;
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LicensePlanService,
        mockDrizzleProvider,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(LicensePlanService);
    db = module.get(DRIZZLE);
  });

  describe('getLicensePlanOrFail', () => {
    it('should return the license plan when found', async () => {
      const plan = { id: 'plan-1', name: 'Free' } as LicensePlan;
      db.query.licensePlans.findFirst.mockResolvedValueOnce(plan);

      const result = await service.getLicensePlanOrFail('plan-1');

      expect(result).toBe(plan);
    });

    it('should throw EntityNotFoundException when not found', async () => {

      await expect(service.getLicensePlanOrFail('missing')).rejects.toThrow(
        EntityNotFoundException
      );
    });
  });

  describe('licensePlanByNameExists', () => {
    it('should return true when a plan with the given name exists', async () => {
      db.query.licensePlans.findFirst.mockResolvedValueOnce({ id: 'plan-1', name: 'Free' });

      const result = await service.licensePlanByNameExists('Free');

      expect(result).toBe(true);
    });

    it('should return false when no plan with the given name exists', async () => {
      // findFirst returns undefined by default
      const result = await service.licensePlanByNameExists('NonExistent');

      expect(result).toBe(false);
    });
  });

  describe('createLicensePlan', () => {
    it('should create a plan with all provided fields and save it', async () => {
      const inputData = {
        name: 'Premium',
        assignToNewOrganizationAccounts: true,
        assignToNewUserAccounts: false,
        enabled: true,
        isFree: false,
        licenseCredential: 'SPACE_LICENSE' as any,
        pricePerMonth: 99,
        requiresContactSupport: false,
        requiresPaymentMethod: true,
        sortOrder: 1,
        trialEnabled: true,
        type: 'SPACE' as any,
      };
      const savedPlan = { id: 'plan-new', ...inputData } as any;
      db.returning.mockResolvedValueOnce([savedPlan]);

      const result = await service.createLicensePlan(inputData);

      expect(result).toBe(savedPlan);
    });
  });

  describe('deleteLicensePlan', () => {
    it('should find the plan and remove it, preserving the ID', async () => {
      const plan = { id: 'plan-1', name: 'Free' } as LicensePlan;
      db.query.licensePlans.findFirst.mockResolvedValueOnce(plan);

      const result = await service.deleteLicensePlan({ ID: 'plan-1' });

      expect(result.id).toBe('plan-1');
    });

    it('should throw EntityNotFoundException when plan to delete is not found', async () => {

      await expect(
        service.deleteLicensePlan({ ID: 'missing' })
      ).rejects.toThrow(EntityNotFoundException);
    });
  });
});
