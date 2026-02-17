import { Test, TestingModule } from '@nestjs/testing';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { IAccountLicensePlan } from './account.license.plan.interface';
import { AccountLicensePlanService } from './account.license.plan.service';
import { UpdateAccountLicensePlanInput } from './dto/account.license.plan.dto.update';

describe('AccountLicensePlanService', () => {
  let service: AccountLicensePlanService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AccountLicensePlanService, MockWinstonProvider],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(AccountLicensePlanService);
  });

  describe('updateLicensePlan', () => {
    const basePlan: IAccountLicensePlan = {
      spaceFree: 1,
      spacePlus: 2,
      spacePremium: 3,
      virtualContributor: 4,
      innovationPacks: 5,
      startingPages: 6,
    };

    const clonePlan = (): IAccountLicensePlan =>
      JSON.parse(JSON.stringify(basePlan));

    it('should update only spaceFree when only spaceFree is provided', () => {
      // Arrange
      const plan = clonePlan();
      const updateData: UpdateAccountLicensePlanInput = { spaceFree: 10 };

      // Act
      const result = service.updateLicensePlan(plan, updateData);

      // Assert
      expect(result.spaceFree).toBe(10);
      expect(result.spacePlus).toBe(2);
      expect(result.spacePremium).toBe(3);
      expect(result.virtualContributor).toBe(4);
      expect(result.innovationPacks).toBe(5);
      expect(result.startingPages).toBe(6);
    });

    it('should update all fields when all are provided', () => {
      // Arrange
      const plan = clonePlan();
      const updateData: UpdateAccountLicensePlanInput = {
        spaceFree: 10,
        spacePlus: 20,
        spacePremium: 30,
        virtualContributor: 40,
        innovationPacks: 50,
        startingPages: 60,
      };

      // Act
      const result = service.updateLicensePlan(plan, updateData);

      // Assert
      expect(result.spaceFree).toBe(10);
      expect(result.spacePlus).toBe(20);
      expect(result.spacePremium).toBe(30);
      expect(result.virtualContributor).toBe(40);
      expect(result.innovationPacks).toBe(50);
      expect(result.startingPages).toBe(60);
    });

    it('should not modify any field when updateData is empty', () => {
      // Arrange
      const plan = clonePlan();
      const updateData: UpdateAccountLicensePlanInput = {};

      // Act
      const result = service.updateLicensePlan(plan, updateData);

      // Assert
      expect(result).toEqual(basePlan);
    });

    it('should return the same plan object (mutates in place)', () => {
      // Arrange
      const plan = clonePlan();
      const updateData: UpdateAccountLicensePlanInput = { spaceFree: 99 };

      // Act
      const result = service.updateLicensePlan(plan, updateData);

      // Assert
      expect(result).toBe(plan);
    });

    it('should allow setting a field to zero', () => {
      // Arrange
      const plan = clonePlan();
      const updateData: UpdateAccountLicensePlanInput = {
        spaceFree: 0,
        virtualContributor: 0,
      };

      // Act
      const result = service.updateLicensePlan(plan, updateData);

      // Assert
      expect(result.spaceFree).toBe(0);
      expect(result.virtualContributor).toBe(0);
      // Unchanged fields
      expect(result.spacePlus).toBe(2);
    });

    it('should update startingPages independently of other fields', () => {
      // Arrange
      const plan = clonePlan();
      const updateData: UpdateAccountLicensePlanInput = { startingPages: 100 };

      // Act
      const result = service.updateLicensePlan(plan, updateData);

      // Assert
      expect(result.startingPages).toBe(100);
      expect(result.spaceFree).toBe(1);
    });

    it('should handle updating only spacePlus and spacePremium', () => {
      // Arrange
      const plan = clonePlan();
      const updateData: UpdateAccountLicensePlanInput = {
        spacePlus: 15,
        spacePremium: 25,
      };

      // Act
      const result = service.updateLicensePlan(plan, updateData);

      // Assert
      expect(result.spacePlus).toBe(15);
      expect(result.spacePremium).toBe(25);
      expect(result.spaceFree).toBe(1);
      expect(result.virtualContributor).toBe(4);
      expect(result.innovationPacks).toBe(5);
      expect(result.startingPages).toBe(6);
    });
  });
});
