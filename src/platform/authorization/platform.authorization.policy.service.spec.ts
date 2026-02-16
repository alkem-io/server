import { EntityNotFoundException } from '@common/exceptions';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { Test, TestingModule } from '@nestjs/testing';
import { Platform } from '@platform/platform/platform.entity';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { vi } from 'vitest';
import { PlatformAuthorizationPolicyService } from './platform.authorization.policy.service';
import { mockDrizzleProvider } from '@test/utils/drizzle.mock.factory';
import { DRIZZLE } from '@config/drizzle/drizzle.constants';

describe('PlatformAuthorizationPolicyService', () => {
  let service: PlatformAuthorizationPolicyService;
  let authorizationPolicyService: AuthorizationPolicyService;
  let db: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlatformAuthorizationPolicyService,
        mockDrizzleProvider,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(PlatformAuthorizationPolicyService);
    authorizationPolicyService = module.get(AuthorizationPolicyService);
    db = module.get(DRIZZLE);
  });

  describe('getPlatformAuthorizationPolicy', () => {
    it('should return the authorization policy when platform is found', async () => {
      const authPolicy = { id: 'auth-1' } as IAuthorizationPolicy;
      const platform = { authorization: authPolicy } as Platform;
      db.query.platforms.findFirst.mockResolvedValueOnce(platform);

      const result = await service.getPlatformAuthorizationPolicy();

      expect(result).toBe(authPolicy);
    });

    it('should throw EntityNotFoundException when platform is not found', async () => {
      // findFirst returns undefined by default
      await expect(service.getPlatformAuthorizationPolicy()).rejects.toThrow(
        EntityNotFoundException
      );
    });

    it('should throw EntityNotFoundException when platform has no authorization', async () => {
      const platform = { authorization: undefined } as unknown as Platform;
      db.query.platforms.findFirst.mockResolvedValueOnce(platform);

      await expect(service.getPlatformAuthorizationPolicy()).rejects.toThrow(
        EntityNotFoundException
      );
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
