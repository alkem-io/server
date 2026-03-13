import { PlatformRolesAccessService } from '@domain/access/platform-roles-access/platform.roles.access.service';
import { RoleSetService } from '@domain/access/role-set/role.set.service';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { MemoAuthorizationService } from '@domain/common/memo/memo.service.authorization';
import { WhiteboardAuthorizationService } from '@domain/common/whiteboard/whiteboard.service.authorization';
import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { LinkAuthorizationService } from '../link/link.service.authorization';
import { PostAuthorizationService } from '../post/post.service.authorization';
import { CalloutContributionService } from './callout.contribution.service';
import { CalloutContributionAuthorizationService } from './callout.contribution.service.authorization';

describe('CalloutContributionAuthorizationService', () => {
  let service: CalloutContributionAuthorizationService;
  let contributionService: CalloutContributionService;
  let authorizationPolicyService: AuthorizationPolicyService;
  let postAuthorizationService: PostAuthorizationService;
  let whiteboardAuthorizationService: WhiteboardAuthorizationService;
  let linkAuthorizationService: LinkAuthorizationService;
  let memoAuthorizationService: MemoAuthorizationService;
  let platformRolesAccessService: PlatformRolesAccessService;
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
    whiteboardAuthorizationService = module.get(WhiteboardAuthorizationService);
    linkAuthorizationService = module.get(LinkAuthorizationService);
    memoAuthorizationService = module.get(MemoAuthorizationService);
    platformRolesAccessService = module.get(PlatformRolesAccessService);
    roleSetService = module.get(RoleSetService);
  });

  const platformRolesAccess = { roles: [] } as any;

  function setupBaseMocks(contribution: any) {
    vi.mocked(
      contributionService.getCalloutContributionOrFail
    ).mockResolvedValue(contribution);
    vi.mocked(
      authorizationPolicyService.inheritParentAuthorization
    ).mockReturnValue(contribution.authorization);
    vi.mocked(authorizationPolicyService.createCredentialRule).mockReturnValue({
      id: 'rule',
      cascade: true,
    } as any);
    vi.mocked(
      authorizationPolicyService.appendCredentialAuthorizationRules
    ).mockReturnValue(contribution.authorization);
    vi.mocked(
      platformRolesAccessService.getCredentialsForRolesWithAccess
    ).mockReturnValue([]);
  }

  describe('applyAuthorizationPolicy', () => {
    it('should inherit parent authorization and append credential rules', async () => {
      const contribAuth = {
        id: 'auth-contrib',
        credentialRules: [],
      } as any;
      const contribution = {
        id: 'contrib-1',
        createdBy: 'user-1',
        authorization: contribAuth,
        post: undefined,
        whiteboard: undefined,
        link: undefined,
        memo: undefined,
      } as any;
      const parentAuth = { id: 'auth-parent' } as any;

      setupBaseMocks(contribution);

      const result = await service.applyAuthorizationPolicy(
        'contrib-1',
        parentAuth,
        platformRolesAccess
      );

      expect(
        authorizationPolicyService.inheritParentAuthorization
      ).toHaveBeenCalledWith(contribAuth, parentAuth);
      expect(result).toContain(contribAuth);
    });

    it('should propagate authorization to post when present', async () => {
      const contribution = {
        id: 'contrib-1',
        createdBy: 'user-1',
        authorization: { id: 'auth-contrib', credentialRules: [] },
        post: {
          id: 'post-1',
          authorization: { id: 'auth-post' },
          profile: { id: 'profile-1' },
        },
        whiteboard: undefined,
        link: undefined,
        memo: undefined,
      } as any;

      setupBaseMocks(contribution);
      vi.mocked(
        postAuthorizationService.applyAuthorizationPolicy
      ).mockResolvedValue([{ id: 'auth-post-result' }] as any);

      const result = await service.applyAuthorizationPolicy(
        'contrib-1',
        undefined,
        platformRolesAccess
      );

      expect(
        postAuthorizationService.applyAuthorizationPolicy
      ).toHaveBeenCalledWith(
        contribution.post,
        contribution.authorization,
        platformRolesAccess,
        undefined
      );
      expect(result.length).toBe(2);
    });

    it('should propagate authorization to whiteboard when present', async () => {
      const contribution = {
        id: 'contrib-1',
        createdBy: 'user-1',
        authorization: { id: 'auth-contrib', credentialRules: [] },
        post: undefined,
        whiteboard: { id: 'wb-1', authorization: { id: 'auth-wb' } },
        link: undefined,
        memo: undefined,
      } as any;
      const spaceSettings = { collaboration: {} } as any;

      setupBaseMocks(contribution);
      vi.mocked(
        whiteboardAuthorizationService.applyAuthorizationPolicy
      ).mockResolvedValue([{ id: 'auth-wb-result' }] as any);

      const result = await service.applyAuthorizationPolicy(
        'contrib-1',
        undefined,
        platformRolesAccess,
        undefined,
        spaceSettings
      );

      expect(
        whiteboardAuthorizationService.applyAuthorizationPolicy
      ).toHaveBeenCalledWith('wb-1', contribution.authorization, spaceSettings);
      expect(result.length).toBe(2);
    });

    it('should propagate authorization to link when present', async () => {
      const contribution = {
        id: 'contrib-1',
        createdBy: 'user-1',
        authorization: { id: 'auth-contrib', credentialRules: [] },
        post: undefined,
        whiteboard: undefined,
        link: {
          id: 'link-1',
          authorization: { id: 'auth-link' },
          profile: { id: 'profile-1' },
        },
        memo: undefined,
      } as any;

      setupBaseMocks(contribution);
      vi.mocked(
        linkAuthorizationService.applyAuthorizationPolicy
      ).mockResolvedValue([{ id: 'auth-link-result' }] as any);

      const result = await service.applyAuthorizationPolicy(
        'contrib-1',
        undefined,
        platformRolesAccess
      );

      expect(
        linkAuthorizationService.applyAuthorizationPolicy
      ).toHaveBeenCalledWith(
        contribution.link,
        contribution.authorization,
        'user-1'
      );
      expect(result.length).toBe(2);
    });

    it('should propagate authorization to memo when present', async () => {
      const contribution = {
        id: 'contrib-1',
        createdBy: 'user-1',
        authorization: { id: 'auth-contrib', credentialRules: [] },
        post: undefined,
        whiteboard: undefined,
        link: undefined,
        memo: { id: 'memo-1', authorization: { id: 'auth-memo' } },
      } as any;

      setupBaseMocks(contribution);
      vi.mocked(
        memoAuthorizationService.applyAuthorizationPolicy
      ).mockResolvedValue([{ id: 'auth-memo-result' }] as any);

      const result = await service.applyAuthorizationPolicy(
        'contrib-1',
        undefined,
        platformRolesAccess
      );

      expect(
        memoAuthorizationService.applyAuthorizationPolicy
      ).toHaveBeenCalledWith('memo-1', contribution.authorization);
      expect(result.length).toBe(2);
    });

    it('should add self-management credential rules when createdBy is set', async () => {
      const contribution = {
        id: 'contrib-1',
        createdBy: 'user-123',
        authorization: { id: 'auth-contrib', credentialRules: [] },
        post: undefined,
        whiteboard: undefined,
        link: undefined,
        memo: undefined,
      } as any;

      setupBaseMocks(contribution);

      await service.applyAuthorizationPolicy(
        'contrib-1',
        undefined,
        platformRolesAccess
      );

      // Should create two credential rules for createdBy (CRU + DELETE)
      expect(
        authorizationPolicyService.createCredentialRule
      ).toHaveBeenCalledTimes(3); // 2 for createdBy + 1 for admins move
    });

    it('should not add self-management rules when createdBy is empty', async () => {
      const contribution = {
        id: 'contrib-1',
        createdBy: '',
        authorization: { id: 'auth-contrib', credentialRules: [] },
        post: undefined,
        whiteboard: undefined,
        link: undefined,
        memo: undefined,
      } as any;

      setupBaseMocks(contribution);

      await service.applyAuthorizationPolicy(
        'contrib-1',
        undefined,
        platformRolesAccess
      );

      // Only the admins move rule, no createdBy rules
      expect(
        authorizationPolicyService.createCredentialRule
      ).toHaveBeenCalledTimes(1);
    });

    it('should include roleSet credentials for admin move when roleSet is provided', async () => {
      const contribution = {
        id: 'contrib-1',
        createdBy: '',
        authorization: { id: 'auth-contrib', credentialRules: [] },
        post: undefined,
        whiteboard: undefined,
        link: undefined,
        memo: undefined,
      } as any;
      const roleSet = { id: 'roleset-1' } as any;

      setupBaseMocks(contribution);
      vi.mocked(
        roleSetService.getCredentialsForRoleWithParents
      ).mockResolvedValue([{ type: 'space-admin', resourceID: 'space-1' }]);

      await service.applyAuthorizationPolicy(
        'contrib-1',
        undefined,
        platformRolesAccess,
        roleSet
      );

      expect(
        roleSetService.getCredentialsForRoleWithParents
      ).toHaveBeenCalledWith(roleSet, expect.any(String));
    });
  });
});
