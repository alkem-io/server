import { EntityNotInitializedException } from '@common/exceptions/entity.not.initialized.exception';
import { RelationshipNotFoundException } from '@common/exceptions/relationship.not.found.exception';
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
  let innovationFlowService: InnovationFlowService;
  let authorizationPolicyService: AuthorizationPolicyService;
  let profileAuthorizationService: ProfileAuthorizationService;
  let innovationFlowStateAuthorizationService: InnovationFlowStateAuthorizationService;

  beforeEach(async () => {
    vi.restoreAllMocks();

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
    innovationFlowService = module.get(InnovationFlowService);
    authorizationPolicyService = module.get(AuthorizationPolicyService);
    profileAuthorizationService = module.get(ProfileAuthorizationService);
    innovationFlowStateAuthorizationService = module.get(
      InnovationFlowStateAuthorizationService
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('applyAuthorizationPolicy', () => {
    it('should apply authorization to flow, profile, and all states', async () => {
      const innovationFlow = {
        id: 'flow-1',
        authorization: {
          id: 'auth-flow',
          credentialRules: [],
          privilegeRules: [],
        },
        profile: { id: 'profile-1' },
        states: [
          { id: 's-1', authorization: { id: 'auth-s1' } },
          { id: 's-2', authorization: { id: 'auth-s2' } },
        ],
      } as any;

      vi.mocked(
        innovationFlowService.getInnovationFlowOrFail
      ).mockResolvedValue(innovationFlow);
      vi.mocked(authorizationPolicyService.reset).mockReturnValue(
        innovationFlow.authorization
      );
      vi.mocked(
        authorizationPolicyService.inheritParentAuthorization
      ).mockReturnValue(innovationFlow.authorization);
      vi.mocked(
        authorizationPolicyService.appendCredentialAuthorizationRules
      ).mockReturnValue(undefined as any);
      vi.mocked(
        authorizationPolicyService.appendPrivilegeAuthorizationRuleMapping
      ).mockReturnValue(innovationFlow.authorization);
      vi.mocked(
        profileAuthorizationService.applyAuthorizationPolicy
      ).mockResolvedValue([{ id: 'auth-profile' }] as any);
      vi.mocked(
        innovationFlowStateAuthorizationService.applyAuthorizationPolicy
      ).mockReturnValue({ id: 'auth-state' } as any);

      const result = await service.applyAuthorizationPolicy('flow-1', {
        id: 'parent-auth',
      } as any);

      expect(authorizationPolicyService.reset).toHaveBeenCalled();
      expect(
        authorizationPolicyService.inheritParentAuthorization
      ).toHaveBeenCalled();
      expect(
        profileAuthorizationService.applyAuthorizationPolicy
      ).toHaveBeenCalledWith('profile-1', innovationFlow.authorization);
      expect(
        innovationFlowStateAuthorizationService.applyAuthorizationPolicy
      ).toHaveBeenCalledTimes(2);
      // flow auth + profile auth + 2 state auths
      expect(result.length).toBe(4);
    });

    it('should throw RelationshipNotFoundException when profile is missing', async () => {
      const innovationFlow = {
        id: 'flow-1',
        authorization: { id: 'auth-flow' },
        profile: undefined,
        states: [],
      } as any;

      vi.mocked(
        innovationFlowService.getInnovationFlowOrFail
      ).mockResolvedValue(innovationFlow);

      await expect(
        service.applyAuthorizationPolicy('flow-1', undefined)
      ).rejects.toThrow(RelationshipNotFoundException);
    });

    it('should throw RelationshipNotFoundException when states are missing', async () => {
      const innovationFlow = {
        id: 'flow-1',
        authorization: { id: 'auth-flow' },
        profile: { id: 'p-1' },
        states: undefined,
      } as any;

      vi.mocked(
        innovationFlowService.getInnovationFlowOrFail
      ).mockResolvedValue(innovationFlow);

      await expect(
        service.applyAuthorizationPolicy('flow-1', undefined)
      ).rejects.toThrow(RelationshipNotFoundException);
    });

    it('should throw EntityNotInitializedException when authorization is undefined', async () => {
      const innovationFlow = {
        id: 'flow-1',
        authorization: undefined,
        profile: { id: 'p-1' },
        states: [],
      } as any;

      vi.mocked(
        innovationFlowService.getInnovationFlowOrFail
      ).mockResolvedValue(innovationFlow);
      vi.mocked(authorizationPolicyService.reset).mockReturnValue(
        undefined as any
      );
      vi.mocked(
        authorizationPolicyService.inheritParentAuthorization
      ).mockReturnValue(undefined as any);

      await expect(
        service.applyAuthorizationPolicy('flow-1', undefined)
      ).rejects.toThrow(EntityNotInitializedException);
    });
  });
});
