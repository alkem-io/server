import { Test, TestingModule } from '@nestjs/testing';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { repositoryProviderMockFactory } from '@test/utils/repository.provider.mock.factory';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MockType } from '@test/utils/mock.type';
import { Repository } from 'typeorm';
import { Platform } from '@platform/platform/platform.entity';
import { PlatformAuthorizationPolicyService } from './platform.authorization.policy.service';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { EntityNotFoundException } from '@common/exceptions';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { vi } from 'vitest';

describe('PlatformAuthorizationPolicyService', () => {
  let service: PlatformAuthorizationPolicyService;
  let platformRepository: MockType<Repository<Platform>>;
  let authorizationPolicyService: AuthorizationPolicyService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlatformAuthorizationPolicyService,
        repositoryProviderMockFactory(Platform),
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(PlatformAuthorizationPolicyService);
    platformRepository = module.get(getRepositoryToken(Platform));
    authorizationPolicyService = module.get(AuthorizationPolicyService);
  });

  describe('getPlatformAuthorizationPolicy', () => {
    it('should return the authorization policy when platform is found', async () => {
      const authPolicy = { id: 'auth-1' } as IAuthorizationPolicy;
      const platform = { authorization: authPolicy } as Platform;
      platformRepository.findOne!.mockResolvedValue(platform);

      const result = await service.getPlatformAuthorizationPolicy();

      expect(result).toBe(authPolicy);
    });

    it('should throw EntityNotFoundException when platform is not found', async () => {
      platformRepository.findOne!.mockResolvedValue(null);

      await expect(
        service.getPlatformAuthorizationPolicy()
      ).rejects.toThrow(EntityNotFoundException);
    });

    it('should throw EntityNotFoundException when platform has no authorization', async () => {
      const platform = { authorization: undefined } as unknown as Platform;
      platformRepository.findOne!.mockResolvedValue(platform);

      await expect(
        service.getPlatformAuthorizationPolicy()
      ).rejects.toThrow(EntityNotFoundException);
    });
  });

  describe('inheritRootAuthorizationPolicy', () => {
    it('should delegate to authorizationPolicyService.inheritParentAuthorization with child auth', () => {
      const childAuth = { id: 'child-1' } as IAuthorizationPolicy;
      const expectedResult = { id: 'inherited-1' } as IAuthorizationPolicy;
      vi.mocked(
        authorizationPolicyService.inheritParentAuthorization
      ).mockReturnValue(expectedResult);

      const result = service.inheritRootAuthorizationPolicy(childAuth);

      expect(
        authorizationPolicyService.inheritParentAuthorization
      ).toHaveBeenCalledWith(childAuth, expect.anything());
      expect(result).toBe(expectedResult);
    });

    it('should handle undefined child authorization', () => {
      const expectedResult = { id: 'inherited-2' } as IAuthorizationPolicy;
      vi.mocked(
        authorizationPolicyService.inheritParentAuthorization
      ).mockReturnValue(expectedResult);

      const result = service.inheritRootAuthorizationPolicy(undefined);

      expect(
        authorizationPolicyService.inheritParentAuthorization
      ).toHaveBeenCalledWith(undefined, expect.anything());
      expect(result).toBe(expectedResult);
    });
  });
});
