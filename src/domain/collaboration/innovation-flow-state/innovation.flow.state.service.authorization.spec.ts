import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { InnovationFlowStateAuthorizationService } from './innovation.flow.state.service.authorization';

describe('InnovationFlowStateAuthorizationService', () => {
  let service: InnovationFlowStateAuthorizationService;
  let authorizationPolicyService: AuthorizationPolicyService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InnovationFlowStateAuthorizationService,
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(InnovationFlowStateAuthorizationService);
    authorizationPolicyService = module.get(AuthorizationPolicyService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('applyAuthorizationPolicy', () => {
    it('should reset and inherit parent authorization', () => {
      const originalAuth = { id: 'auth-s1' };
      const state = {
        id: 's-1',
        authorization: originalAuth,
      } as any;

      const parentAuth = { id: 'parent-auth' } as any;
      const resetAuth = { id: 'reset-auth' } as any;
      const inheritedAuth = { id: 'inherited-auth' } as any;

      vi.mocked(authorizationPolicyService.reset).mockReturnValue(resetAuth);
      vi.mocked(
        authorizationPolicyService.inheritParentAuthorization
      ).mockReturnValue(inheritedAuth);

      const result = service.applyAuthorizationPolicy(state, parentAuth);

      expect(authorizationPolicyService.reset).toHaveBeenCalledWith(
        originalAuth
      );
      expect(
        authorizationPolicyService.inheritParentAuthorization
      ).toHaveBeenCalledWith(resetAuth, parentAuth);
      expect(result).toEqual(inheritedAuth);
    });

    it('should handle undefined parent authorization', () => {
      const state = {
        id: 's-1',
        authorization: { id: 'auth-s1' },
      } as any;

      vi.mocked(authorizationPolicyService.reset).mockReturnValue({
        id: 'reset-auth',
      } as any);
      vi.mocked(
        authorizationPolicyService.inheritParentAuthorization
      ).mockReturnValue({ id: 'inherited-auth' } as any);

      const result = service.applyAuthorizationPolicy(state, undefined);

      expect(
        authorizationPolicyService.inheritParentAuthorization
      ).toHaveBeenCalledWith({ id: 'reset-auth' }, undefined);
      expect(result).toEqual({ id: 'inherited-auth' });
    });
  });
});
