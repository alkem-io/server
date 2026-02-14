import { OrganizationVerificationEnum } from '@common/enums/organization.verification';
import { EntityNotFoundException } from '@common/exceptions';
import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { repositoryProviderMockFactory } from '@test/utils/repository.provider.mock.factory';
import { vi, type Mock } from 'vitest';
import { getRepositoryToken } from '@nestjs/typeorm';
import { OrganizationVerification } from './organization.verification.entity';
import { OrganizationVerificationService } from './organization.verification.service';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { LifecycleService } from '@domain/common/lifecycle/lifecycle.service';

describe('OrganizationVerificationService', () => {
  let service: OrganizationVerificationService;
  let repository: {
    findOne: Mock;
    save: Mock;
    remove: Mock;
  };
  let authorizationPolicyService: {
    delete: Mock;
  };
  let lifecycleService: {
    createLifecycle: Mock;
    deleteLifecycle: Mock;
  };

  beforeEach(async () => {
    // Mock static OrganizationVerification.create to avoid DataSource requirement
    vi.spyOn(OrganizationVerification, 'create').mockImplementation((input: any) => {
      const entity = new OrganizationVerification();
      Object.assign(entity, input);
      return entity as any;
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrganizationVerificationService,
        repositoryProviderMockFactory(OrganizationVerification),
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(OrganizationVerificationService);
    repository = module.get(getRepositoryToken(OrganizationVerification));
    authorizationPolicyService = module.get(AuthorizationPolicyService) as any;
    lifecycleService = module.get(LifecycleService) as any;
  });

  describe('createOrganizationVerification', () => {
    it('should create a verification with NOT_VERIFIED status and lifecycle', async () => {
      const mockLifecycle = { id: 'lifecycle-1' };
      lifecycleService.createLifecycle.mockResolvedValue(mockLifecycle);
      repository.save.mockImplementation((entity: any) => Promise.resolve(entity));

      const result = await service.createOrganizationVerification({
        organizationID: 'org-1',
      } as any);

      expect(result.status).toBe(OrganizationVerificationEnum.NOT_VERIFIED);
      expect(result.authorization).toBeDefined();
      expect(result.lifecycle).toBe(mockLifecycle);
      expect(repository.save).toHaveBeenCalled();
      expect(lifecycleService.createLifecycle).toHaveBeenCalled();
    });
  });

  describe('getOrganizationVerificationOrFail', () => {
    it('should return the verification when found', async () => {
      const mockVerification = { id: 'verification-1', status: OrganizationVerificationEnum.NOT_VERIFIED };
      repository.findOne.mockResolvedValue(mockVerification);

      const result = await service.getOrganizationVerificationOrFail('verification-1');

      expect(result).toBe(mockVerification);
    });

    it('should throw EntityNotFoundException when verification is not found', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(
        service.getOrganizationVerificationOrFail('nonexistent')
      ).rejects.toThrow(EntityNotFoundException);
    });
  });

  describe('delete', () => {
    it('should delete authorization policy, lifecycle, and the verification entity', async () => {
      const mockVerification = {
        id: 'verification-1',
        authorization: { id: 'auth-1' },
        lifecycle: { id: 'lifecycle-1' },
      };
      repository.findOne.mockResolvedValue(mockVerification);
      authorizationPolicyService.delete.mockResolvedValue(undefined);
      lifecycleService.deleteLifecycle.mockResolvedValue(undefined);
      repository.remove.mockResolvedValue({ ...mockVerification, id: undefined });

      const result = await service.delete('verification-1');

      expect(authorizationPolicyService.delete).toHaveBeenCalledWith(
        mockVerification.authorization
      );
      expect(lifecycleService.deleteLifecycle).toHaveBeenCalledWith('lifecycle-1');
      expect(repository.remove).toHaveBeenCalled();
      expect(result.id).toBe('verification-1');
    });

    it('should skip authorization deletion when authorization is not present', async () => {
      const mockVerification = {
        id: 'verification-1',
        authorization: undefined,
        lifecycle: { id: 'lifecycle-1' },
      };
      repository.findOne.mockResolvedValue(mockVerification);
      lifecycleService.deleteLifecycle.mockResolvedValue(undefined);
      repository.remove.mockResolvedValue({ ...mockVerification, id: undefined });

      await service.delete('verification-1');

      expect(authorizationPolicyService.delete).not.toHaveBeenCalled();
    });

    it('should skip lifecycle deletion when lifecycle is not present', async () => {
      const mockVerification = {
        id: 'verification-1',
        authorization: { id: 'auth-1' },
        lifecycle: undefined,
      };
      repository.findOne.mockResolvedValue(mockVerification);
      authorizationPolicyService.delete.mockResolvedValue(undefined);
      repository.remove.mockResolvedValue({ ...mockVerification, id: undefined });

      await service.delete('verification-1');

      expect(lifecycleService.deleteLifecycle).not.toHaveBeenCalled();
    });
  });

  describe('save', () => {
    it('should delegate to the repository save method', async () => {
      const mockVerification = { id: 'verification-1' } as any;
      repository.save.mockResolvedValue(mockVerification);

      const result = await service.save(mockVerification);

      expect(result).toBe(mockVerification);
      expect(repository.save).toHaveBeenCalledWith(mockVerification);
    });
  });
});
