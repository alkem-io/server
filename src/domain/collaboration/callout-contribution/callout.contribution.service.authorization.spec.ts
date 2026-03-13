import { RoleSetService } from '@domain/access/role-set/role.set.service';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { PostAuthorizationService } from '../post/post.service.authorization';
import { CalloutContributionService } from './callout.contribution.service';
import { CalloutContributionAuthorizationService } from './callout.contribution.service.authorization';

describe('CalloutContributionAuthorizationService', () => {
  let service: CalloutContributionAuthorizationService;
  let contributionService: CalloutContributionService;
  let authorizationPolicyService: AuthorizationPolicyService;
  let postAuthorizationService: PostAuthorizationService;
  let roleSetService: RoleSetService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CalloutContributionAuthorizationService,
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(CalloutContributionAuthorizationService);
    contributionService = module.get(CalloutContributionService);
    authorizationPolicyService = module.get(AuthorizationPolicyService);
    postAuthorizationService = module.get(PostAuthorizationService);
    roleSetService = module.get(RoleSetService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('applyAuthorizationPolicy', () => {
    const platformRolesAccess = { roles: [] } as any;

    function makeContribution(overrides: any = {}) {
      return {
        id: 'contrib-1',
        createdBy: 'user-1',
        authorization: {
          id: 'auth-1',
          credentialRules: [],
          privilegeRules: [],
        },
        post: undefined,
        whiteboard: undefined,
        link: undefined,
        memo: undefined,
        ...overrides,
      } as any;
    }

    it('should inherit parent authorization and append credential rules', async () => {
      const contribution = makeContribution();
      vi.mocked(
        contributionService.getCalloutContributionOrFail
      ).mockResolvedValue(contribution);
      vi.mocked(
        authorizationPolicyService.inheritParentAuthorization
      ).mockReturnValue(contribution.authorization);
      vi.mocked(
        authorizationPolicyService.createCredentialRule
      ).mockReturnValue({ grantedPrivileges: [] } as any);
      vi.mocked(
        authorizationPolicyService.appendCredentialAuthorizationRules
      ).mockReturnValue(contribution.authorization);

      const platformRolesAccessService = (service as any)
        .platformRolesAccessService;
      vi.mocked(
        platformRolesAccessService.getCredentialsForRolesWithAccess
      ).mockReturnValue([]);

      const result = await service.applyAuthorizationPolicy(
        'contrib-1',
        { id: 'parent-auth' } as any,
        platformRolesAccess
      );

      expect(result).toContain(contribution.authorization);
      expect(
        authorizationPolicyService.inheritParentAuthorization
      ).toHaveBeenCalled();
    });

    it('should apply post authorization when post exists', async () => {
      const contribution = makeContribution({
        post: {
          id: 'post-1',
          authorization: { id: 'post-auth' },
          profile: { id: 'p-1', authorization: { id: 'p-auth' } },
          comments: undefined,
        },
      });

      vi.mocked(
        contributionService.getCalloutContributionOrFail
      ).mockResolvedValue(contribution);
      vi.mocked(
        authorizationPolicyService.inheritParentAuthorization
      ).mockReturnValue(contribution.authorization);
      vi.mocked(
        authorizationPolicyService.createCredentialRule
      ).mockReturnValue({ grantedPrivileges: [] } as any);
      vi.mocked(
        authorizationPolicyService.appendCredentialAuthorizationRules
      ).mockReturnValue(contribution.authorization);
      vi.mocked(
        postAuthorizationService.applyAuthorizationPolicy
      ).mockResolvedValue([{ id: 'post-updated-auth' }] as any);

      const platformRolesAccessService = (service as any)
        .platformRolesAccessService;
      vi.mocked(
        platformRolesAccessService.getCredentialsForRolesWithAccess
      ).mockReturnValue([]);

      const result = await service.applyAuthorizationPolicy(
        'contrib-1',
        undefined,
        platformRolesAccess
      );

      expect(
        postAuthorizationService.applyAuthorizationPolicy
      ).toHaveBeenCalled();
      expect(result.length).toBeGreaterThanOrEqual(2);
    });

    it('should apply whiteboard authorization when whiteboard exists', async () => {
      const contribution = makeContribution({
        whiteboard: {
          id: 'wb-1',
          authorization: { id: 'wb-auth' },
          profile: { id: 'p-1' },
        },
      });

      vi.mocked(
        contributionService.getCalloutContributionOrFail
      ).mockResolvedValue(contribution);
      vi.mocked(
        authorizationPolicyService.inheritParentAuthorization
      ).mockReturnValue(contribution.authorization);
      vi.mocked(
        authorizationPolicyService.createCredentialRule
      ).mockReturnValue({ grantedPrivileges: [] } as any);
      vi.mocked(
        authorizationPolicyService.appendCredentialAuthorizationRules
      ).mockReturnValue(contribution.authorization);

      const whiteboardAuthService = (service as any)
        .whiteboardAuthorizationService;
      vi.mocked(
        whiteboardAuthService.applyAuthorizationPolicy
      ).mockResolvedValue([{ id: 'wb-updated-auth' }] as any);

      const platformRolesAccessService = (service as any)
        .platformRolesAccessService;
      vi.mocked(
        platformRolesAccessService.getCredentialsForRolesWithAccess
      ).mockReturnValue([]);

      const _result = await service.applyAuthorizationPolicy(
        'contrib-1',
        undefined,
        platformRolesAccess
      );

      expect(whiteboardAuthService.applyAuthorizationPolicy).toHaveBeenCalled();
    });

    it('should apply link authorization when link exists', async () => {
      const contribution = makeContribution({
        link: {
          id: 'link-1',
          authorization: { id: 'link-auth' },
          profile: { id: 'p-1' },
        },
      });

      vi.mocked(
        contributionService.getCalloutContributionOrFail
      ).mockResolvedValue(contribution);
      vi.mocked(
        authorizationPolicyService.inheritParentAuthorization
      ).mockReturnValue(contribution.authorization);
      vi.mocked(
        authorizationPolicyService.createCredentialRule
      ).mockReturnValue({ grantedPrivileges: [] } as any);
      vi.mocked(
        authorizationPolicyService.appendCredentialAuthorizationRules
      ).mockReturnValue(contribution.authorization);

      const linkAuthService = (service as any).linkAuthorizationService;
      vi.mocked(linkAuthService.applyAuthorizationPolicy).mockResolvedValue([
        { id: 'link-updated-auth' },
      ] as any);

      const platformRolesAccessService = (service as any)
        .platformRolesAccessService;
      vi.mocked(
        platformRolesAccessService.getCredentialsForRolesWithAccess
      ).mockReturnValue([]);

      const _result = await service.applyAuthorizationPolicy(
        'contrib-1',
        undefined,
        platformRolesAccess
      );

      expect(linkAuthService.applyAuthorizationPolicy).toHaveBeenCalled();
    });

    it('should apply memo authorization when memo exists', async () => {
      const contribution = makeContribution({
        memo: {
          id: 'memo-1',
          authorization: { id: 'memo-auth' },
          profile: { id: 'p-1' },
        },
      });

      vi.mocked(
        contributionService.getCalloutContributionOrFail
      ).mockResolvedValue(contribution);
      vi.mocked(
        authorizationPolicyService.inheritParentAuthorization
      ).mockReturnValue(contribution.authorization);
      vi.mocked(
        authorizationPolicyService.createCredentialRule
      ).mockReturnValue({ grantedPrivileges: [] } as any);
      vi.mocked(
        authorizationPolicyService.appendCredentialAuthorizationRules
      ).mockReturnValue(contribution.authorization);

      const memoAuthService = (service as any).memoAuthorizationService;
      vi.mocked(memoAuthService.applyAuthorizationPolicy).mockResolvedValue([
        { id: 'memo-updated-auth' },
      ] as any);

      const platformRolesAccessService = (service as any)
        .platformRolesAccessService;
      vi.mocked(
        platformRolesAccessService.getCredentialsForRolesWithAccess
      ).mockReturnValue([]);

      const _result = await service.applyAuthorizationPolicy(
        'contrib-1',
        undefined,
        platformRolesAccess
      );

      expect(memoAuthService.applyAuthorizationPolicy).toHaveBeenCalled();
    });

    it('should handle contribution with no createdBy', async () => {
      const contribution = makeContribution({ createdBy: undefined });

      vi.mocked(
        contributionService.getCalloutContributionOrFail
      ).mockResolvedValue(contribution);
      vi.mocked(
        authorizationPolicyService.inheritParentAuthorization
      ).mockReturnValue(contribution.authorization);
      vi.mocked(
        authorizationPolicyService.appendCredentialAuthorizationRules
      ).mockReturnValue(contribution.authorization);

      const platformRolesAccessService = (service as any)
        .platformRolesAccessService;
      vi.mocked(
        platformRolesAccessService.getCredentialsForRolesWithAccess
      ).mockReturnValue([]);

      const result = await service.applyAuthorizationPolicy(
        'contrib-1',
        undefined,
        platformRolesAccess
      );

      expect(result).toContain(contribution.authorization);
    });

    it('should include roleSet credentials when roleSet is provided', async () => {
      const contribution = makeContribution();

      vi.mocked(
        contributionService.getCalloutContributionOrFail
      ).mockResolvedValue(contribution);
      vi.mocked(
        authorizationPolicyService.inheritParentAuthorization
      ).mockReturnValue(contribution.authorization);
      vi.mocked(
        authorizationPolicyService.createCredentialRule
      ).mockReturnValue({ grantedPrivileges: [], cascade: false } as any);
      vi.mocked(
        authorizationPolicyService.appendCredentialAuthorizationRules
      ).mockReturnValue(contribution.authorization);
      vi.mocked(
        roleSetService.getCredentialsForRoleWithParents
      ).mockResolvedValue([
        { type: 'space-admin', resourceID: 'space-1' },
      ] as any);

      const platformRolesAccessService = (service as any)
        .platformRolesAccessService;
      vi.mocked(
        platformRolesAccessService.getCredentialsForRolesWithAccess
      ).mockReturnValue([]);

      const roleSet = { id: 'rs-1' } as any;

      await service.applyAuthorizationPolicy(
        'contrib-1',
        undefined,
        platformRolesAccess,
        roleSet
      );

      expect(
        roleSetService.getCredentialsForRoleWithParents
      ).toHaveBeenCalled();
    });
  });
});
