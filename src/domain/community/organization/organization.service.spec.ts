import {
  EntityNotFoundException,
  EntityNotInitializedException,
  ValidationException,
} from '@common/exceptions';
import { Organization } from '@domain/community/organization/organization.entity';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { vi } from 'vitest';
import { OrganizationService } from './organization.service';

describe('OrganizationService', () => {
  let service: OrganizationService;
  let orgRepo: {
    findOne: ReturnType<typeof vi.fn>;
    find: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
    countBy: ReturnType<typeof vi.fn>;
    createQueryBuilder: ReturnType<typeof vi.fn>;
    manager: { transaction: ReturnType<typeof vi.fn> };
  };

  beforeEach(async () => {
    orgRepo = {
      findOne: vi.fn(),
      find: vi.fn(),
      save: vi.fn(),
      count: vi.fn(),
      countBy: vi.fn(),
      createQueryBuilder: vi.fn(),
      manager: { transaction: vi.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrganizationService,
        {
          provide: getRepositoryToken(Organization),
          useValue: orgRepo,
        },
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get<OrganizationService>(OrganizationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getOrganizationOrFail', () => {
    it('should return organization when found', async () => {
      const mockOrg = { id: 'org-1', nameID: 'test-org' };
      orgRepo.findOne.mockResolvedValue(mockOrg);

      const result = await service.getOrganizationOrFail('org-1');

      expect(result).toBe(mockOrg);
    });

    it('should throw EntityNotFoundException when not found', async () => {
      orgRepo.findOne.mockResolvedValue(null);

      await expect(
        service.getOrganizationOrFail('nonexistent')
      ).rejects.toThrow(EntityNotFoundException);
    });
  });

  describe('getOrganization', () => {
    it('should return organization when found', async () => {
      const mockOrg = { id: 'org-1' };
      orgRepo.findOne.mockResolvedValue(mockOrg);

      const result = await service.getOrganization('org-1');

      expect(result).toBe(mockOrg);
    });

    it('should return null when not found', async () => {
      orgRepo.findOne.mockResolvedValue(null);

      const result = await service.getOrganization('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('getRoleSet', () => {
    it('should return roleSet when loaded', async () => {
      const roleSet = { id: 'rs-1' };
      orgRepo.findOne.mockResolvedValue({ id: 'org-1', roleSet });

      const result = await service.getRoleSet({ id: 'org-1' } as any);

      expect(result).toBe(roleSet);
    });

    it('should throw when roleSet not loaded', async () => {
      orgRepo.findOne.mockResolvedValue({
        id: 'org-1',
        roleSet: undefined,
      });

      await expect(service.getRoleSet({ id: 'org-1' } as any)).rejects.toThrow(
        EntityNotInitializedException
      );
    });
  });

  describe('checkNameIdOrFail', () => {
    it('should not throw when nameID is available', async () => {
      orgRepo.count.mockResolvedValue(0);

      await expect(
        service.checkNameIdOrFail('available-name')
      ).resolves.not.toThrow();
    });

    it('should throw ValidationException when nameID is taken', async () => {
      orgRepo.count.mockResolvedValue(1);

      await expect(service.checkNameIdOrFail('taken-name')).rejects.toThrow(
        ValidationException
      );
    });
  });

  describe('checkDisplayNameOrFail', () => {
    it('should not throw when displayName is undefined', async () => {
      await expect(
        service.checkDisplayNameOrFail(undefined)
      ).resolves.not.toThrow();
    });

    it('should not throw when displayName matches existing', async () => {
      await expect(
        service.checkDisplayNameOrFail('Same Name', 'Same Name')
      ).resolves.not.toThrow();
    });

    it('should not throw when displayName is available', async () => {
      orgRepo.countBy.mockResolvedValue(0);

      await expect(
        service.checkDisplayNameOrFail('New Name')
      ).resolves.not.toThrow();
    });

    it('should throw when displayName is taken', async () => {
      orgRepo.countBy.mockResolvedValue(1);

      await expect(
        service.checkDisplayNameOrFail('Taken Name')
      ).rejects.toThrow(ValidationException);
    });
  });

  describe('save', () => {
    it('should save and return organization', async () => {
      const org = { id: 'org-1' } as any;
      orgRepo.save.mockResolvedValue(org);

      const result = await service.save(org);

      expect(result).toBe(org);
    });
  });
});
