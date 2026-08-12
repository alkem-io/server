import { CREDENTIAL_RULE_POST_ADMINS_MOVE } from '@common/constants/authorization/credential.rule.constants';
import { AuthorizationCredential } from '@common/enums/authorization.credential';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { RelationshipNotFoundException } from '@common/exceptions';
import { RoleSetService } from '@domain/access/role-set/role.set.service';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { ProfileAuthorizationService } from '@domain/common/profile/profile.service.authorization';
import { RoomAuthorizationService } from '@domain/communication/room/room.service.authorization';
import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { PostAuthorizationService } from './post.service.authorization';

describe('PostAuthorizationService', () => {
  let service: PostAuthorizationService;
  let authorizationPolicyService: AuthorizationPolicyService;
  let roomAuthorizationService: RoomAuthorizationService;
  let roleSetService: RoleSetService;
  let profileAuthorizationService: ProfileAuthorizationService;

  beforeEach(async () => {
    vi.restoreAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PostAuthorizationService,
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(PostAuthorizationService);
    authorizationPolicyService = module.get(AuthorizationPolicyService);
    roomAuthorizationService = module.get(RoomAuthorizationService);
    roleSetService = module.get(RoleSetService);
    profileAuthorizationService = module.get(ProfileAuthorizationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('applyAuthorizationPolicy', () => {
    const platformRolesAccess = { roles: [] } as any;

    function makePost(overrides: any = {}) {
      return {
        id: 'post-1',
        createdBy: 'user-1',
        authorization: {
          id: 'auth-1',
          credentialRules: [],
          privilegeRules: [],
        },
        profile: { id: 'p-1' },
        comments: undefined,
        ...overrides,
      } as any;
    }

    it('should throw RelationshipNotFoundException when profile is missing', async () => {
      const post = makePost({ profile: undefined });

      await expect(
        service.applyAuthorizationPolicy(post, undefined, platformRolesAccess)
      ).rejects.toThrow(RelationshipNotFoundException);
    });

    it('should inherit parent authorization and return updated policies', async () => {
      const post = makePost();
      vi.mocked(
        authorizationPolicyService.inheritParentAuthorization
      ).mockReturnValue(post.authorization);
      vi.mocked(
        authorizationPolicyService.createCredentialRule
      ).mockReturnValue({ grantedPrivileges: [], cascade: false } as any);
      vi.mocked(
        authorizationPolicyService.appendCredentialAuthorizationRules
      ).mockReturnValue(post.authorization);
      vi.mocked(
        profileAuthorizationService.applyAuthorizationPolicy
      ).mockResolvedValue([{ id: 'profile-auth' }] as any);

      const platformRolesAccessService = (service as any)
        .platformRolesAccessService;
      vi.mocked(
        platformRolesAccessService.getCredentialsForRolesWithAccess
      ).mockReturnValue([]);

      const result = await service.applyAuthorizationPolicy(
        post,
        { id: 'parent-auth' } as any,
        platformRolesAccess
      );

      expect(result).toContain(post.authorization);
      expect(
        authorizationPolicyService.inheritParentAuthorization
      ).toHaveBeenCalled();
      expect(
        profileAuthorizationService.applyAuthorizationPolicy
      ).toHaveBeenCalledWith('p-1', post.authorization);
    });

    it('should apply comments authorization when comments exist', async () => {
      const post = makePost({
        comments: {
          id: 'room-1',
          authorization: { id: 'room-auth' },
        },
      });

      vi.mocked(
        authorizationPolicyService.inheritParentAuthorization
      ).mockReturnValue(post.authorization);
      vi.mocked(
        authorizationPolicyService.createCredentialRule
      ).mockReturnValue({ grantedPrivileges: [], cascade: false } as any);
      vi.mocked(
        authorizationPolicyService.appendCredentialAuthorizationRules
      ).mockReturnValue(post.authorization);
      vi.mocked(
        roomAuthorizationService.applyAuthorizationPolicy
      ).mockReturnValue({ id: 'room-updated-auth' } as any);
      vi.mocked(
        roomAuthorizationService.allowContributorsToCreateMessages
      ).mockReturnValue({ id: 'room-msg-auth' } as any);
      vi.mocked(
        roomAuthorizationService.allowContributorsToReplyReactToMessages
      ).mockReturnValue({ id: 'room-reply-auth' } as any);
      vi.mocked(
        profileAuthorizationService.applyAuthorizationPolicy
      ).mockResolvedValue([]);

      const platformRolesAccessService = (service as any)
        .platformRolesAccessService;
      vi.mocked(
        platformRolesAccessService.getCredentialsForRolesWithAccess
      ).mockReturnValue([]);

      const _result = await service.applyAuthorizationPolicy(
        post,
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

    it('should include roleSet admin credentials when roleSet is provided', async () => {
      const post = makePost();
      vi.mocked(
        authorizationPolicyService.inheritParentAuthorization
      ).mockReturnValue(post.authorization);
      vi.mocked(
        authorizationPolicyService.createCredentialRule
      ).mockReturnValue({ grantedPrivileges: [], cascade: false } as any);
      vi.mocked(
        authorizationPolicyService.appendCredentialAuthorizationRules
      ).mockReturnValue(post.authorization);
      vi.mocked(
        roleSetService.getCredentialsForRoleWithParents
      ).mockResolvedValue([
        { type: 'space-admin', resourceID: 'space-1' },
      ] as any);
      vi.mocked(
        profileAuthorizationService.applyAuthorizationPolicy
      ).mockResolvedValue([]);

      const platformRolesAccessService = (service as any)
        .platformRolesAccessService;
      vi.mocked(
        platformRolesAccessService.getCredentialsForRolesWithAccess
      ).mockReturnValue([]);

      const roleSet = { id: 'rs-1' } as any;

      await service.applyAuthorizationPolicy(
        post,
        undefined,
        platformRolesAccess,
        roleSet
      );

      expect(
        roleSetService.getCredentialsForRoleWithParents
      ).toHaveBeenCalled();
      // Should create MOVE_POST rule with admin credentials
      expect(
        authorizationPolicyService.createCredentialRule
      ).toHaveBeenCalled();
    });

    it('should still create MOVE_POST rule for platform-resource-admin when no local admin credentials exist', async () => {
      const post = makePost();
      vi.mocked(
        authorizationPolicyService.inheritParentAuthorization
      ).mockReturnValue(post.authorization);
      vi.mocked(
        authorizationPolicyService.createCredentialRule
      ).mockReturnValue({ grantedPrivileges: [], cascade: false } as any);
      vi.mocked(
        authorizationPolicyService.appendCredentialAuthorizationRules
      ).mockReturnValue(post.authorization);
      vi.mocked(
        profileAuthorizationService.applyAuthorizationPolicy
      ).mockResolvedValue([]);

      const platformRolesAccessService = (service as any)
        .platformRolesAccessService;
      vi.mocked(
        platformRolesAccessService.getCredentialsForRolesWithAccess
      ).mockReturnValue([]);

      await service.applyAuthorizationPolicy(
        post,
        undefined,
        platformRolesAccess
      );

      // 027-platform-role-redesign (T038, A9): createCredentialRule is now
      // ALWAYS called for MOVE_POST too, even with zero local admin
      // credentials and no roleSet — platform-resource-admin is appended
      // unconditionally (global credential, resourceID: ''), which is the
      // whole point of the role: it must reach every space's move surface
      // regardless of local admin standing.
      expect(
        authorizationPolicyService.createCredentialRule
      ).toHaveBeenCalledTimes(2);
      expect(
        authorizationPolicyService.createCredentialRule
      ).toHaveBeenCalledWith(
        [AuthorizationPrivilege.MOVE_POST],
        [
          {
            type: AuthorizationCredential.PLATFORM_RESOURCE_ADMIN,
            resourceID: '',
          },
        ],
        CREDENTIAL_RULE_POST_ADMINS_MOVE
      );
    });
  });
});
