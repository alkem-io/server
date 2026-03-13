import { ForumDiscussionPrivacy } from '@common/enums/forum.discussion.privacy';
import { RelationshipNotFoundException } from '@common/exceptions/relationship.not.found.exception';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { ProfileAuthorizationService } from '@domain/common/profile/profile.service.authorization';
import { Test, TestingModule } from '@nestjs/testing';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mock } from 'vitest';
import { RoomAuthorizationService } from '../../domain/communication/room/room.service.authorization';
import { DiscussionService } from './discussion.service';
import { DiscussionAuthorizationService } from './discussion.service.authorization';

describe('DiscussionAuthorizationService', () => {
  let service: DiscussionAuthorizationService;
  let authorizationPolicyService: AuthorizationPolicyService;
  let discussionService: DiscussionService;
  let profileAuthorizationService: ProfileAuthorizationService;
  let roomAuthorizationService: RoomAuthorizationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DiscussionAuthorizationService, MockWinstonProvider],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(DiscussionAuthorizationService);
    authorizationPolicyService = module.get(AuthorizationPolicyService);
    discussionService = module.get(DiscussionService);
    profileAuthorizationService = module.get(ProfileAuthorizationService);
    roomAuthorizationService = module.get(RoomAuthorizationService);
  });

  describe('applyAuthorizationPolicy', () => {
    const mockParentAuth = { id: 'parent-auth' } as any;

    it('should throw RelationshipNotFoundException when profile or comments are missing', async () => {
      const discussion = {
        id: 'd1',
        profile: undefined,
        comments: undefined,
        authorization: { id: 'auth-d1' },
      };
      (discussionService.getDiscussionOrFail as Mock).mockResolvedValue(
        discussion
      );

      await expect(
        service.applyAuthorizationPolicy({ id: 'd1' } as any, mockParentAuth)
      ).rejects.toThrow(RelationshipNotFoundException);
    });

    it('should apply authorization for PUBLIC privacy discussion', async () => {
      const discussion = {
        id: 'd1',
        profile: { id: 'profile-1' },
        comments: { id: 'comments-1' },
        authorization: { id: 'auth-d1' },
        privacy: ForumDiscussionPrivacy.PUBLIC,
      };
      (discussionService.getDiscussionOrFail as Mock).mockResolvedValue(
        discussion
      );
      (
        authorizationPolicyService.inheritParentAuthorization as Mock
      ).mockReturnValue({ id: 'inherited-auth' });

      // extendAuthorizationPolicy is private, mocked via public interface
      (
        authorizationPolicyService.createCredentialRuleUsingTypesOnly as Mock
      ).mockReturnValue({ cascade: true });
      (
        authorizationPolicyService.appendCredentialAuthorizationRules as Mock
      ).mockReturnValue({ id: 'extended-auth' });
      (
        authorizationPolicyService.cloneAuthorizationPolicy as Mock
      ).mockReturnValue({ id: 'cloned-auth' });
      (
        authorizationPolicyService.appendCredentialRuleAnonymousRegisteredAccess as Mock
      ).mockReturnValue({ id: 'public-auth' });
      (
        profileAuthorizationService.applyAuthorizationPolicy as Mock
      ).mockResolvedValue([{ id: 'profile-auth' }]);
      (
        roomAuthorizationService.applyAuthorizationPolicy as Mock
      ).mockReturnValue({ id: 'room-auth' });
      (
        roomAuthorizationService.allowContributorsToCreateMessages as Mock
      ).mockReturnValue({ id: 'room-auth-create' });
      (
        roomAuthorizationService.allowContributorsToReplyReactToMessages as Mock
      ).mockReturnValue({ id: 'room-auth-reply' });

      const result = await service.applyAuthorizationPolicy(
        { id: 'd1' } as any,
        mockParentAuth
      );

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThanOrEqual(3);
      expect(
        authorizationPolicyService.appendCredentialRuleAnonymousRegisteredAccess
      ).toHaveBeenCalled();
    });

    it('should apply authorization for AUTHENTICATED privacy discussion', async () => {
      const discussion = {
        id: 'd1',
        profile: { id: 'profile-1' },
        comments: { id: 'comments-1' },
        authorization: { id: 'auth-d1' },
        privacy: ForumDiscussionPrivacy.AUTHENTICATED,
      };
      (discussionService.getDiscussionOrFail as Mock).mockResolvedValue(
        discussion
      );
      (
        authorizationPolicyService.inheritParentAuthorization as Mock
      ).mockReturnValue({ id: 'inherited-auth' });
      (
        authorizationPolicyService.createCredentialRuleUsingTypesOnly as Mock
      ).mockReturnValue({ cascade: true });
      (
        authorizationPolicyService.appendCredentialAuthorizationRules as Mock
      ).mockReturnValue({ id: 'extended-auth' });
      (
        authorizationPolicyService.cloneAuthorizationPolicy as Mock
      ).mockReturnValue({ id: 'cloned-auth' });
      (
        profileAuthorizationService.applyAuthorizationPolicy as Mock
      ).mockResolvedValue([{ id: 'profile-auth' }]);
      (
        roomAuthorizationService.applyAuthorizationPolicy as Mock
      ).mockReturnValue({ id: 'room-auth' });
      (
        roomAuthorizationService.allowContributorsToCreateMessages as Mock
      ).mockReturnValue({ id: 'room-auth-create' });
      (
        roomAuthorizationService.allowContributorsToReplyReactToMessages as Mock
      ).mockReturnValue({ id: 'room-auth-reply' });

      const result = await service.applyAuthorizationPolicy(
        { id: 'd1' } as any,
        mockParentAuth
      );

      expect(result).toBeDefined();
      expect(
        authorizationPolicyService.appendCredentialRuleAnonymousRegisteredAccess
      ).not.toHaveBeenCalled();
    });

    it('should apply authorization for AUTHOR privacy discussion', async () => {
      const discussion = {
        id: 'd1',
        profile: { id: 'profile-1' },
        comments: { id: 'comments-1' },
        authorization: { id: 'auth-d1' },
        privacy: ForumDiscussionPrivacy.AUTHOR,
      };
      (discussionService.getDiscussionOrFail as Mock).mockResolvedValue(
        discussion
      );
      (
        authorizationPolicyService.inheritParentAuthorization as Mock
      ).mockReturnValue({ id: 'inherited-auth' });
      (
        authorizationPolicyService.createCredentialRuleUsingTypesOnly as Mock
      ).mockReturnValue({ cascade: true });
      (
        authorizationPolicyService.appendCredentialAuthorizationRules as Mock
      ).mockReturnValue({ id: 'extended-auth' });
      (
        authorizationPolicyService.cloneAuthorizationPolicy as Mock
      ).mockReturnValue({ id: 'cloned-auth' });
      (
        profileAuthorizationService.applyAuthorizationPolicy as Mock
      ).mockResolvedValue([{ id: 'profile-auth' }]);
      (
        roomAuthorizationService.applyAuthorizationPolicy as Mock
      ).mockReturnValue({ id: 'room-auth' });
      (
        roomAuthorizationService.allowContributorsToCreateMessages as Mock
      ).mockReturnValue({ id: 'room-auth-create' });
      (
        roomAuthorizationService.allowContributorsToReplyReactToMessages as Mock
      ).mockReturnValue({ id: 'room-auth-reply' });

      const result = await service.applyAuthorizationPolicy(
        { id: 'd1' } as any,
        mockParentAuth
      );

      expect(result).toBeDefined();
      expect(
        authorizationPolicyService.appendCredentialRuleAnonymousRegisteredAccess
      ).not.toHaveBeenCalled();
    });

    it('should properly configure room authorization for comments', async () => {
      const discussion = {
        id: 'd1',
        profile: { id: 'profile-1' },
        comments: { id: 'comments-1' },
        authorization: { id: 'auth-d1' },
        privacy: ForumDiscussionPrivacy.AUTHENTICATED,
      };
      (discussionService.getDiscussionOrFail as Mock).mockResolvedValue(
        discussion
      );
      (
        authorizationPolicyService.inheritParentAuthorization as Mock
      ).mockReturnValue({ id: 'inherited-auth' });
      (
        authorizationPolicyService.createCredentialRuleUsingTypesOnly as Mock
      ).mockReturnValue({ cascade: true });
      (
        authorizationPolicyService.appendCredentialAuthorizationRules as Mock
      ).mockReturnValue({ id: 'extended-auth' });
      (
        authorizationPolicyService.cloneAuthorizationPolicy as Mock
      ).mockReturnValue({ id: 'cloned-auth' });
      (
        profileAuthorizationService.applyAuthorizationPolicy as Mock
      ).mockResolvedValue([]);
      (
        roomAuthorizationService.applyAuthorizationPolicy as Mock
      ).mockReturnValue({ id: 'room-auth' });
      (
        roomAuthorizationService.allowContributorsToCreateMessages as Mock
      ).mockReturnValue({ id: 'room-auth-create' });
      (
        roomAuthorizationService.allowContributorsToReplyReactToMessages as Mock
      ).mockReturnValue({ id: 'room-auth-final' });

      await service.applyAuthorizationPolicy(
        { id: 'd1' } as any,
        mockParentAuth
      );

      expect(
        roomAuthorizationService.applyAuthorizationPolicy
      ).toHaveBeenCalledWith(discussion.comments, { id: 'cloned-auth' });
      expect(
        roomAuthorizationService.allowContributorsToCreateMessages
      ).toHaveBeenCalled();
      expect(
        roomAuthorizationService.allowContributorsToReplyReactToMessages
      ).toHaveBeenCalled();
    });
  });
});
