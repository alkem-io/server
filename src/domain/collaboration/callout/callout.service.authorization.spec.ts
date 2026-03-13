import { CalloutContributionType } from '@common/enums/callout.contribution.type';
import { CalloutVisibility } from '@common/enums/callout.visibility';
import { EntityNotInitializedException } from '@common/exceptions';
import { RoleSetService } from '@domain/access/role-set/role.set.service';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { RoomAuthorizationService } from '@domain/communication/room/room.service.authorization';
import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { CalloutContributionAuthorizationService } from '../callout-contribution/callout.contribution.service.authorization';
import { CalloutService } from './callout.service';
import { CalloutAuthorizationService } from './callout.service.authorization';

describe('CalloutAuthorizationService', () => {
  let service: CalloutAuthorizationService;
  let calloutService: CalloutService;
  let authorizationPolicyService: AuthorizationPolicyService;
  let contributionAuthorizationService: CalloutContributionAuthorizationService;
  let roomAuthorizationService: RoomAuthorizationService;
  let roleSetService: RoleSetService;

  beforeEach(async () => {
    vi.restoreAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CalloutAuthorizationService,
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(CalloutAuthorizationService);
    calloutService = module.get(CalloutService);
    authorizationPolicyService = module.get(AuthorizationPolicyService);
    contributionAuthorizationService = module.get(
      CalloutContributionAuthorizationService
    );
    roomAuthorizationService = module.get(RoomAuthorizationService);
    roleSetService = module.get(RoleSetService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('applyAuthorizationPolicy', () => {
    const platformRolesAccess = { roles: [] } as any;

    function makeCallout(overrides: any = {}) {
      return {
        id: 'callout-1',
        authorization: {
          id: 'auth-1',
          credentialRules: [],
          privilegeRules: [],
        },
        contributions: [],
        contributionDefaults: { id: 'defaults-1' },
        settings: {
          visibility: CalloutVisibility.PUBLISHED,
          contribution: {
            allowedTypes: [],
          },
          framing: { commentsEnabled: false },
        },
        framing: { id: 'framing-1', profile: { id: 'p-1' } },
        comments: undefined,
        classification: undefined,
        calloutsSet: undefined,
        createdBy: undefined,
        isTemplate: false,
        ...overrides,
      } as any;
    }

    it('should throw EntityNotInitializedException when callout is missing required relations', async () => {
      const callout = {
        id: 'callout-1',
        contributions: undefined,
        contributionDefaults: undefined,
        settings: undefined,
        framing: undefined,
      } as any;

      vi.mocked(calloutService.getCalloutOrFail).mockResolvedValue(callout);

      await expect(
        service.applyAuthorizationPolicy(
          'callout-1',
          undefined,
          platformRolesAccess
        )
      ).rejects.toThrow(EntityNotInitializedException);
    });

    it('should apply authorization policy and return updated authorizations', async () => {
      const callout = makeCallout();
      vi.mocked(calloutService.getCalloutOrFail).mockResolvedValue(callout);
      vi.mocked(
        authorizationPolicyService.inheritParentAuthorization
      ).mockReturnValue(callout.authorization);
      vi.mocked(
        authorizationPolicyService.appendPrivilegeAuthorizationRules
      ).mockReturnValue(callout.authorization);
      vi.mocked(
        authorizationPolicyService.appendCredentialAuthorizationRules
      ).mockReturnValue(callout.authorization);

      // Mock the calloutFramingAuthorizationService
      const framingAuthService = (service as any)
        .calloutFramingAuthorizationService;
      vi.mocked(framingAuthService.applyAuthorizationPolicy).mockResolvedValue(
        []
      );

      const result = await service.applyAuthorizationPolicy(
        'callout-1',
        { id: 'parent-auth', credentialRules: [], privilegeRules: [] } as any,
        platformRolesAccess
      );

      expect(result).toContain(callout.authorization);
      expect(
        authorizationPolicyService.inheritParentAuthorization
      ).toHaveBeenCalled();
    });

    it('should process contributions authorization', async () => {
      const callout = makeCallout({
        contributions: [{ id: 'contrib-1' }, { id: 'contrib-2' }],
      });
      vi.mocked(calloutService.getCalloutOrFail).mockResolvedValue(callout);
      vi.mocked(
        authorizationPolicyService.inheritParentAuthorization
      ).mockReturnValue(callout.authorization);
      vi.mocked(
        authorizationPolicyService.appendPrivilegeAuthorizationRules
      ).mockReturnValue(callout.authorization);
      vi.mocked(
        authorizationPolicyService.appendCredentialAuthorizationRules
      ).mockReturnValue(callout.authorization);
      vi.mocked(
        contributionAuthorizationService.applyAuthorizationPolicy
      ).mockResolvedValue([{ id: 'contrib-auth' }] as any);

      const framingAuthService = (service as any)
        .calloutFramingAuthorizationService;
      vi.mocked(framingAuthService.applyAuthorizationPolicy).mockResolvedValue(
        []
      );

      const result = await service.applyAuthorizationPolicy(
        'callout-1',
        undefined,
        platformRolesAccess
      );

      expect(
        contributionAuthorizationService.applyAuthorizationPolicy
      ).toHaveBeenCalledTimes(2);
      // Should include contribution auth policies
      expect(result.length).toBeGreaterThanOrEqual(3); // callout + 2 contrib
    });

    it('should apply comments authorization when comments exist', async () => {
      const callout = makeCallout({
        comments: { id: 'room-1', authorization: { id: 'room-auth-1' } },
      });
      vi.mocked(calloutService.getCalloutOrFail).mockResolvedValue(callout);
      vi.mocked(
        authorizationPolicyService.inheritParentAuthorization
      ).mockReturnValue(callout.authorization);
      vi.mocked(
        authorizationPolicyService.appendPrivilegeAuthorizationRules
      ).mockReturnValue(callout.authorization);
      vi.mocked(
        authorizationPolicyService.appendCredentialAuthorizationRules
      ).mockReturnValue(callout.authorization);
      vi.mocked(
        roomAuthorizationService.applyAuthorizationPolicy
      ).mockReturnValue({ id: 'comments-auth' } as any);
      vi.mocked(
        roomAuthorizationService.allowContributorsToCreateMessages
      ).mockReturnValue({ id: 'comments-auth-create' } as any);
      vi.mocked(
        roomAuthorizationService.allowContributorsToReplyReactToMessages
      ).mockReturnValue({ id: 'comments-auth-reply' } as any);

      const framingAuthService = (service as any)
        .calloutFramingAuthorizationService;
      vi.mocked(framingAuthService.applyAuthorizationPolicy).mockResolvedValue(
        []
      );

      const _result = await service.applyAuthorizationPolicy(
        'callout-1',
        undefined,
        platformRolesAccess
      );

      expect(
        roomAuthorizationService.applyAuthorizationPolicy
      ).toHaveBeenCalled();
      expect(
        roomAuthorizationService.allowContributorsToCreateMessages
      ).toHaveBeenCalled();
      expect(
        roomAuthorizationService.allowContributorsToReplyReactToMessages
      ).toHaveBeenCalled();
    });

    it('should apply classification authorization when classification exists', async () => {
      const callout = makeCallout({
        classification: { id: 'class-1' },
      });
      vi.mocked(calloutService.getCalloutOrFail).mockResolvedValue(callout);
      vi.mocked(
        authorizationPolicyService.inheritParentAuthorization
      ).mockReturnValue(callout.authorization);
      vi.mocked(
        authorizationPolicyService.appendPrivilegeAuthorizationRules
      ).mockReturnValue(callout.authorization);
      vi.mocked(
        authorizationPolicyService.appendCredentialAuthorizationRules
      ).mockReturnValue(callout.authorization);

      const framingAuthService = (service as any)
        .calloutFramingAuthorizationService;
      vi.mocked(framingAuthService.applyAuthorizationPolicy).mockResolvedValue(
        []
      );

      const classificationAuthService = (service as any)
        .classificationAuthorizationService;
      vi.mocked(
        classificationAuthService.applyAuthorizationPolicy
      ).mockResolvedValue([{ id: 'class-auth' }] as any);

      const _result = await service.applyAuthorizationPolicy(
        'callout-1',
        undefined,
        platformRolesAccess
      );

      expect(
        classificationAuthService.applyAuthorizationPolicy
      ).toHaveBeenCalledWith('class-1', callout.authorization);
    });

    it('should handle DRAFT visibility with space admin credentials', async () => {
      const callout = makeCallout({
        settings: {
          visibility: CalloutVisibility.DRAFT,
          contribution: { allowedTypes: [] },
          framing: { commentsEnabled: false },
        },
        isTemplate: false,
        createdBy: 'user-1',
        calloutsSet: {
          collaboration: {
            space: {
              id: 'space-1',
              community: {
                roleSet: { id: 'rs-1' },
              },
            },
          },
        },
      });

      vi.mocked(calloutService.getCalloutOrFail).mockResolvedValue(callout);
      vi.mocked(
        authorizationPolicyService.cloneAuthorizationPolicy
      ).mockReturnValue({
        id: 'cloned-auth',
        credentialRules: [],
        privilegeRules: [],
      } as any);
      vi.mocked(
        authorizationPolicyService.createCredentialRule
      ).mockReturnValue({
        grantedPrivileges: ['READ'],
        criterias: [],
      } as any);
      vi.mocked(
        authorizationPolicyService.inheritParentAuthorization
      ).mockReturnValue(callout.authorization);
      vi.mocked(
        authorizationPolicyService.appendPrivilegeAuthorizationRules
      ).mockReturnValue(callout.authorization);
      vi.mocked(
        authorizationPolicyService.appendCredentialAuthorizationRules
      ).mockReturnValue(callout.authorization);
      vi.mocked(
        roleSetService.getCredentialsForRoleWithParents
      ).mockResolvedValue([
        { type: 'space-admin', resourceID: 'space-1' },
      ] as any);

      const framingAuthService = (service as any)
        .calloutFramingAuthorizationService;
      vi.mocked(framingAuthService.applyAuthorizationPolicy).mockResolvedValue(
        []
      );

      await service.applyAuthorizationPolicy(
        'callout-1',
        {
          id: 'parent-auth',
          credentialRules: [],
          privilegeRules: [],
        } as any,
        platformRolesAccess
      );

      expect(
        authorizationPolicyService.cloneAuthorizationPolicy
      ).toHaveBeenCalled();
    });

    it('should generate privilege rules for allowed contribution types with POST', async () => {
      const callout = makeCallout({
        settings: {
          visibility: CalloutVisibility.PUBLISHED,
          contribution: {
            allowedTypes: [CalloutContributionType.POST],
          },
          framing: { commentsEnabled: false },
        },
      });

      vi.mocked(calloutService.getCalloutOrFail).mockResolvedValue(callout);
      vi.mocked(
        authorizationPolicyService.inheritParentAuthorization
      ).mockReturnValue(callout.authorization);
      vi.mocked(
        authorizationPolicyService.appendPrivilegeAuthorizationRules
      ).mockReturnValue(callout.authorization);
      vi.mocked(
        authorizationPolicyService.appendCredentialAuthorizationRules
      ).mockReturnValue(callout.authorization);

      const framingAuthService = (service as any)
        .calloutFramingAuthorizationService;
      vi.mocked(framingAuthService.applyAuthorizationPolicy).mockResolvedValue(
        []
      );

      await service.applyAuthorizationPolicy(
        'callout-1',
        undefined,
        platformRolesAccess
      );

      expect(
        authorizationPolicyService.appendPrivilegeAuthorizationRules
      ).toHaveBeenCalled();
    });
  });
});
