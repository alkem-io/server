import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mock } from 'vitest';
import { IAuthorizationPolicy } from '../authorization-policy/authorization.policy.interface';
import { IVisual } from './visual.interface';
import { VisualAuthorizationService } from './visual.service.authorization';

describe('VisualAuthorizationService', () => {
  let service: VisualAuthorizationService;
  let authorizationPolicyService: AuthorizationPolicyService;

  beforeEach(async () => {
    vi.restoreAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VisualAuthorizationService,
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(VisualAuthorizationService);
    authorizationPolicyService = module.get(AuthorizationPolicyService);
  });

  describe('applyAuthorizationPolicy', () => {
    it('should inherit parent authorization and append privilege rules', () => {
      const authorization = {
        id: 'auth-1',
        credentialRules: [],
      } as unknown as IAuthorizationPolicy;
      const parentAuthorization = {
        id: 'parent-auth',
      } as unknown as IAuthorizationPolicy;
      const visual = { authorization } as IVisual;

      (
        authorizationPolicyService.inheritParentAuthorization as Mock
      ).mockReturnValue(authorization);
      (
        authorizationPolicyService.appendPrivilegeAuthorizationRules as Mock
      ).mockReturnValue(authorization);

      const result = service.applyAuthorizationPolicy(
        visual,
        parentAuthorization
      );

      expect(
        authorizationPolicyService.inheritParentAuthorization
      ).toHaveBeenCalledWith(authorization, parentAuthorization);
      expect(
        authorizationPolicyService.appendPrivilegeAuthorizationRules
      ).toHaveBeenCalled();
      expect(result).toBe(authorization);
    });

    it('should work with undefined parent authorization', () => {
      const authorization = {
        id: 'auth-1',
        credentialRules: [],
      } as unknown as IAuthorizationPolicy;
      const visual = { authorization } as IVisual;

      (
        authorizationPolicyService.inheritParentAuthorization as Mock
      ).mockReturnValue(authorization);
      (
        authorizationPolicyService.appendPrivilegeAuthorizationRules as Mock
      ).mockReturnValue(authorization);

      const result = service.applyAuthorizationPolicy(visual, undefined);

      expect(
        authorizationPolicyService.inheritParentAuthorization
      ).toHaveBeenCalledWith(authorization, undefined);
      expect(result).toBe(authorization);
    });
  });
});
