import { RelationshipNotFoundException } from '@common/exceptions';
import { PlatformRolesAccessService } from '@domain/access/platform-roles-access/platform.roles.access.service';
import { RoleSetService } from '@domain/access/role-set/role.set.service';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { ProfileAuthorizationService } from '@domain/common/profile/profile.service.authorization';
import { RoomAuthorizationService } from '@domain/communication/room/room.service.authorization';
import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { IPost } from './post.interface';
import { PostAuthorizationService } from './post.service.authorization';

describe('PostAuthorizationService', () => {
  let service: PostAuthorizationService;
  let authorizationPolicyService: AuthorizationPolicyService;
  let roomAuthorizationService: RoomAuthorizationService;
  let profileAuthorizationService: ProfileAuthorizationService;
  let roleSetService: RoleSetService;
  let platformRolesAccessService: PlatformRolesAccessService;

  beforeEach(async () => {
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
    profileAuthorizationService = module.get(ProfileAuthorizationService);
    roleSetService = module.get(RoleSetService);
    platformRolesAccessService = module.get(PlatformRolesAccessService);
  });

  describe('applyAuthorizationPolicy', () => {
    const platformRolesAccess = { roles: [] } as any;

    it('should throw RelationshipNotFoundException when profile is missing', async () => {
      const post = {
        id: 'post-1',
        profile: undefined,
        authorization: { id: 'auth-1' },
      } as unknown as IPost;

      await expect(
        service.applyAuthorizationPolicy(post, undefined, platformRolesAccess)
      ).rejects.toThrow(RelationshipNotFoundException);
    });

    it('should inherit parent authorization and propagate to profile', async () => {
      const postAuth = { id: 'auth-post', credentialRules: [] } as any;
      const inheritedAuth = {
        id: 'auth-inherited',
        credentialRules: [],
      } as any;
      const parentAuth = { id: 'auth-parent' } as any;

      const post = {
        id: 'post-1',
        createdBy: 'user-1',
        profile: { id: 'profile-1' },
        authorization: postAuth,
        comments: undefined,
      } as unknown as IPost;

      vi.mocked(
        authorizationPolicyService.inheritParentAuthorization
      ).mockReturnValue(inheritedAuth);
      vi.mocked(
        authorizationPolicyService.createCredentialRule
      ).mockReturnValue({ id: 'rule-1' } as any);
      vi.mocked(
        authorizationPolicyService.appendCredentialAuthorizationRules
      ).mockReturnValue(inheritedAuth);
      vi.mocked(
        platformRolesAccessService.getCredentialsForRolesWithAccess
      ).mockReturnValue([]);
      vi.mocked(
        profileAuthorizationService.applyAuthorizationPolicy
      ).mockResolvedValue([{ id: 'auth-profile' }] as any);

      const result = await service.applyAuthorizationPolicy(
        post,
        parentAuth,
        platformRolesAccess
      );

      expect(
        authorizationPolicyService.inheritParentAuthorization
      ).toHaveBeenCalledWith(postAuth, parentAuth);
      expect(
        profileAuthorizationService.applyAuthorizationPolicy
      ).toHaveBeenCalled();
      expect(result.length).toBeGreaterThanOrEqual(2);
    });

    it('should apply room authorization when comments exist', async () => {
      const postAuth = { id: 'auth-post', credentialRules: [] } as any;
      const inheritedAuth = {
        id: 'auth-inherited',
        credentialRules: [],
      } as any;
      const commentsAuth = { id: 'auth-comments' } as any;

      const post = {
        id: 'post-1',
        createdBy: 'user-1',
        profile: { id: 'profile-1' },
        authorization: postAuth,
        comments: { id: 'room-1' },
      } as unknown as IPost;

      vi.mocked(
        authorizationPolicyService.inheritParentAuthorization
      ).mockReturnValue(inheritedAuth);
      vi.mocked(
        authorizationPolicyService.createCredentialRule
      ).mockReturnValue({ id: 'rule-1' } as any);
      vi.mocked(
        authorizationPolicyService.appendCredentialAuthorizationRules
      ).mockReturnValue(inheritedAuth);
      vi.mocked(
        platformRolesAccessService.getCredentialsForRolesWithAccess
      ).mockReturnValue([]);
      vi.mocked(
        roomAuthorizationService.applyAuthorizationPolicy
      ).mockReturnValue(commentsAuth);
      vi.mocked(
        roomAuthorizationService.allowContributorsToCreateMessages
      ).mockReturnValue(commentsAuth);
      vi.mocked(
        roomAuthorizationService.allowContributorsToReplyReactToMessages
      ).mockReturnValue(commentsAuth);
      vi.mocked(
        profileAuthorizationService.applyAuthorizationPolicy
      ).mockResolvedValue([]);

      const result = await service.applyAuthorizationPolicy(
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
      expect(result).toContain(commentsAuth);
    });

    it('should add admin move credentials when roleSet is provided', async () => {
      const postAuth = { id: 'auth-post', credentialRules: [] } as any;
      const inheritedAuth = {
        id: 'auth-inherited',
        credentialRules: [],
      } as any;
      const roleSet = { id: 'roleset-1' } as any;

      const post = {
        id: 'post-1',
        createdBy: 'user-1',
        profile: { id: 'profile-1' },
        authorization: postAuth,
        comments: undefined,
      } as unknown as IPost;

      vi.mocked(
        authorizationPolicyService.inheritParentAuthorization
      ).mockReturnValue(inheritedAuth);
      vi.mocked(
        authorizationPolicyService.createCredentialRule
      ).mockReturnValue({ id: 'rule-1', cascade: true } as any);
      vi.mocked(
        authorizationPolicyService.appendCredentialAuthorizationRules
      ).mockReturnValue(inheritedAuth);
      vi.mocked(
        platformRolesAccessService.getCredentialsForRolesWithAccess
      ).mockReturnValue([]);
      vi.mocked(
        roleSetService.getCredentialsForRoleWithParents
      ).mockResolvedValue([{ type: 'space-admin', resourceID: 'space-1' }]);
      vi.mocked(
        profileAuthorizationService.applyAuthorizationPolicy
      ).mockResolvedValue([]);

      await service.applyAuthorizationPolicy(
        post,
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
