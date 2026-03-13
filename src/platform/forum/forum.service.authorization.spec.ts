import { RelationshipNotFoundException } from '@common/exceptions/relationship.not.found.exception';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { Test, TestingModule } from '@nestjs/testing';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mocked } from 'vitest';
import { DiscussionAuthorizationService } from '../forum-discussion/discussion.service.authorization';
import { ForumService } from './forum.service';
import { ForumAuthorizationService } from './forum.service.authorization';

describe('ForumAuthorizationService', () => {
  let service: ForumAuthorizationService;
  let forumService: Mocked<ForumService>;
  let authorizationPolicyService: Mocked<AuthorizationPolicyService>;
  let discussionAuthorizationService: Mocked<DiscussionAuthorizationService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ForumAuthorizationService, MockWinstonProvider],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(ForumAuthorizationService);
    forumService = module.get(ForumService) as Mocked<ForumService>;
    authorizationPolicyService = module.get(
      AuthorizationPolicyService
    ) as Mocked<AuthorizationPolicyService>;
    discussionAuthorizationService = module.get(
      DiscussionAuthorizationService
    ) as Mocked<DiscussionAuthorizationService>;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('applyAuthorizationPolicy', () => {
    const parentAuth = { id: 'parent-auth' } as any;

    it('should throw RelationshipNotFoundException when discussions not loaded', async () => {
      const forum = {
        id: 'forum-1',
        authorization: { id: 'auth-1', credentialRules: [] },
        discussions: undefined,
      } as any;

      forumService.getForumOrFail.mockResolvedValue(forum);

      await expect(
        service.applyAuthorizationPolicy(forum, parentAuth)
      ).rejects.toThrow(RelationshipNotFoundException);
    });

    it('should apply authorization policy to forum and all discussions', async () => {
      const discussion1 = { id: 'disc-1' } as any;
      const discussion2 = { id: 'disc-2' } as any;
      const forum = {
        id: 'forum-1',
        authorization: { id: 'auth-1', credentialRules: [] },
        discussions: [discussion1, discussion2],
      } as any;

      forumService.getForumOrFail.mockResolvedValue(forum);
      authorizationPolicyService.inheritParentAuthorization.mockReturnValue(
        forum.authorization
      );
      authorizationPolicyService.createCredentialRuleUsingTypesOnly.mockReturnValue(
        {
          cascade: false,
        } as any
      );
      authorizationPolicyService.appendPrivilegeAuthorizationRules.mockReturnValue(
        forum.authorization
      );
      discussionAuthorizationService.applyAuthorizationPolicy.mockResolvedValue(
        [{ id: 'updated-auth' } as any]
      );

      const result = await service.applyAuthorizationPolicy(forum, parentAuth);

      expect(forumService.getForumOrFail).toHaveBeenCalledWith(
        'forum-1',
        expect.any(Object)
      );
      expect(
        authorizationPolicyService.inheritParentAuthorization
      ).toHaveBeenCalled();
      // 3 credential rules: create, contribute, read
      expect(
        authorizationPolicyService.createCredentialRuleUsingTypesOnly
      ).toHaveBeenCalledTimes(3);
      expect(
        authorizationPolicyService.appendPrivilegeAuthorizationRules
      ).toHaveBeenCalled();
      // 2 discussions
      expect(
        discussionAuthorizationService.applyAuthorizationPolicy
      ).toHaveBeenCalledTimes(2);
      expect(result.length).toBeGreaterThanOrEqual(3); // forum auth + 2 discussion auths
    });

    it('should handle empty discussions array', async () => {
      const forum = {
        id: 'forum-1',
        authorization: { id: 'auth-1', credentialRules: [] },
        discussions: [],
      } as any;

      forumService.getForumOrFail.mockResolvedValue(forum);
      authorizationPolicyService.inheritParentAuthorization.mockReturnValue(
        forum.authorization
      );
      authorizationPolicyService.createCredentialRuleUsingTypesOnly.mockReturnValue(
        {
          cascade: false,
        } as any
      );
      authorizationPolicyService.appendPrivilegeAuthorizationRules.mockReturnValue(
        forum.authorization
      );

      const result = await service.applyAuthorizationPolicy(forum, parentAuth);

      expect(result).toHaveLength(1); // Only forum authorization
      expect(
        discussionAuthorizationService.applyAuthorizationPolicy
      ).not.toHaveBeenCalled();
    });
  });
});
