import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { IInnovationFlowState } from './innovation.flow.state.interface';
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

  describe('applyAuthorizationPolicy', () => {
    it('should reset and inherit parent authorization', () => {
      const stateAuth = { id: 'auth-state', credentialRules: [] } as any;
      const resetAuth = { id: 'auth-reset', credentialRules: [] } as any;
      const inheritedAuth = {
        id: 'auth-inherited',
        credentialRules: [],
      } as any;
      const parentAuth = { id: 'auth-parent', credentialRules: [] } as any;

      const state = {
        authorization: stateAuth,
      } as IInnovationFlowState;

      vi.mocked(authorizationPolicyService.reset).mockReturnValue(resetAuth);
      vi.mocked(
        authorizationPolicyService.inheritParentAuthorization
      ).mockReturnValue(inheritedAuth);

      const result = service.applyAuthorizationPolicy(state, parentAuth);

      expect(authorizationPolicyService.reset).toHaveBeenCalledWith(stateAuth);
      expect(
        authorizationPolicyService.inheritParentAuthorization
      ).toHaveBeenCalledWith(resetAuth, parentAuth);
      expect(result).toBe(inheritedAuth);
      expect(state.authorization).toBe(inheritedAuth);
    });

    it('should handle undefined parent authorization', () => {
      const stateAuth = { id: 'auth-state', credentialRules: [] } as any;
      const resetAuth = { id: 'auth-reset', credentialRules: [] } as any;
      const inheritedAuth = {
        id: 'auth-inherited',
        credentialRules: [],
      } as any;

      const state = {
        authorization: stateAuth,
      } as IInnovationFlowState;

      vi.mocked(authorizationPolicyService.reset).mockReturnValue(resetAuth);
      vi.mocked(
        authorizationPolicyService.inheritParentAuthorization
      ).mockReturnValue(inheritedAuth);

      const result = service.applyAuthorizationPolicy(state, undefined);

      expect(
        authorizationPolicyService.inheritParentAuthorization
      ).toHaveBeenCalledWith(resetAuth, undefined);
      expect(result).toBe(inheritedAuth);
    });
  });
});
