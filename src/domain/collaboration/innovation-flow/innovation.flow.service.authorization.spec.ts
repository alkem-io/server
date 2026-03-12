import { RelationshipNotFoundException } from '@common/exceptions';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { ProfileAuthorizationService } from '@domain/common/profile/profile.service.authorization';
import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { InnovationFlowStateAuthorizationService } from '../innovation-flow-state/innovation.flow.state.service.authorization';
import { InnovationFlowService } from './innovation.flow.service';
import { InnovationFlowAuthorizationService } from './innovation.flow.service.authorization';

describe('InnovationFlowAuthorizationService', () => {
  let service: InnovationFlowAuthorizationService;
  let authorizationPolicyService: AuthorizationPolicyService;
  let profileAuthorizationService: ProfileAuthorizationService;
  let innovationFlowService: InnovationFlowService;
  let stateAuthorizationService: InnovationFlowStateAuthorizationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InnovationFlowAuthorizationService,
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(InnovationFlowAuthorizationService);
    authorizationPolicyService = module.get(AuthorizationPolicyService);
    profileAuthorizationService = module.get(ProfileAuthorizationService);
    innovationFlowService = module.get(InnovationFlowService);
    stateAuthorizationService = module.get(
      InnovationFlowStateAuthorizationService
    );
  });

  describe('applyAuthorizationPolicy', () => {
    it('should throw RelationshipNotFoundException when profile is missing', async () => {
      const flow = {
        id: 'flow-1',
        profile: undefined,
        states: [],
        authorization: { id: 'auth-1' },
      } as any;

      vi.mocked(
        innovationFlowService.getInnovationFlowOrFail
      ).mockResolvedValue(flow);

      await expect(
        service.applyAuthorizationPolicy('flow-1', undefined)
      ).rejects.toThrow(RelationshipNotFoundException);
    });

    it('should throw RelationshipNotFoundException when states is missing', async () => {
      const flow = {
        id: 'flow-1',
        profile: { id: 'profile-1' },
        states: undefined,
        authorization: { id: 'auth-1' },
      } as any;

      vi.mocked(
        innovationFlowService.getInnovationFlowOrFail
      ).mockResolvedValue(flow);

      await expect(
        service.applyAuthorizationPolicy('flow-1', undefined)
      ).rejects.toThrow(RelationshipNotFoundException);
    });

    it('should reset, inherit, and append rules for authorization', async () => {
      const flowAuth = { id: 'auth-flow', credentialRules: [] } as any;
      const resetAuth = { id: 'auth-reset', credentialRules: [] } as any;
      const inheritedAuth = {
        id: 'auth-inherited',
        credentialRules: [],
      } as any;
      const parentAuth = { id: 'auth-parent' } as any;
      const stateAuth = { id: 'auth-state' } as any;

      const flow = {
        id: 'flow-1',
        profile: { id: 'profile-1' },
        states: [{ id: 'state-1', authorization: { id: 'sa-1' } }],
        authorization: flowAuth,
      } as any;

      vi.mocked(
        innovationFlowService.getInnovationFlowOrFail
      ).mockResolvedValue(flow);
      vi.mocked(authorizationPolicyService.reset).mockReturnValue(resetAuth);
      vi.mocked(
        authorizationPolicyService.inheritParentAuthorization
      ).mockReturnValue(inheritedAuth);
      vi.mocked(
        authorizationPolicyService.appendCredentialAuthorizationRules
      ).mockReturnValue(inheritedAuth);
      vi.mocked(
        authorizationPolicyService.appendPrivilegeAuthorizationRuleMapping
      ).mockReturnValue(inheritedAuth);
      vi.mocked(
        profileAuthorizationService.applyAuthorizationPolicy
      ).mockResolvedValue([{ id: 'auth-profile' }] as any);
      vi.mocked(
        stateAuthorizationService.applyAuthorizationPolicy
      ).mockReturnValue(stateAuth);

      const result = await service.applyAuthorizationPolicy(
        'flow-1',
        parentAuth
      );

      expect(authorizationPolicyService.reset).toHaveBeenCalledWith(flowAuth);
      expect(
        authorizationPolicyService.inheritParentAuthorization
      ).toHaveBeenCalledWith(resetAuth, parentAuth);
      expect(
        profileAuthorizationService.applyAuthorizationPolicy
      ).toHaveBeenCalledWith('profile-1', expect.anything());
      expect(
        stateAuthorizationService.applyAuthorizationPolicy
      ).toHaveBeenCalledWith(flow.states[0], expect.anything());
      expect(result.length).toBe(3); // flow auth + profile auth + state auth
    });

    it('should iterate over all states', async () => {
      const inheritedAuth = {
        id: 'auth-inherited',
        credentialRules: [],
      } as any;
      const flow = {
        id: 'flow-1',
        profile: { id: 'profile-1' },
        states: [
          { id: 'state-1', authorization: {} },
          { id: 'state-2', authorization: {} },
          { id: 'state-3', authorization: {} },
        ],
        authorization: { id: 'auth-flow', credentialRules: [] },
      } as any;

      vi.mocked(
        innovationFlowService.getInnovationFlowOrFail
      ).mockResolvedValue(flow);
      vi.mocked(authorizationPolicyService.reset).mockReturnValue(
        inheritedAuth
      );
      vi.mocked(
        authorizationPolicyService.inheritParentAuthorization
      ).mockReturnValue(inheritedAuth);
      vi.mocked(
        authorizationPolicyService.appendCredentialAuthorizationRules
      ).mockReturnValue(inheritedAuth);
      vi.mocked(
        authorizationPolicyService.appendPrivilegeAuthorizationRuleMapping
      ).mockReturnValue(inheritedAuth);
      vi.mocked(
        profileAuthorizationService.applyAuthorizationPolicy
      ).mockResolvedValue([]);
      vi.mocked(
        stateAuthorizationService.applyAuthorizationPolicy
      ).mockReturnValue({ id: 'state-auth' } as any);

      const result = await service.applyAuthorizationPolicy(
        'flow-1',
        undefined
      );

      expect(
        stateAuthorizationService.applyAuthorizationPolicy
      ).toHaveBeenCalledTimes(3);
      // flow auth + 3 state auths = 4
      expect(result.length).toBe(4);
    });
  });
});
