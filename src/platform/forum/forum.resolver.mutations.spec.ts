import { SUBSCRIPTION_DISCUSSION_UPDATED } from '@common/constants/providers';
import { ForumDiscussionCategory } from '@common/enums/forum.discussion.category';
import { ValidationException } from '@common/exceptions/validation.exception';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { Test, TestingModule } from '@nestjs/testing';
import { NotificationPlatformAdapter } from '@services/adapters/notification-adapter/notification.platform.adapter';
import { NamingService } from '@services/infrastructure/naming/naming.service';
import { PlatformAuthorizationPolicyService } from '@src/platform/authorization/platform.authorization.policy.service';
import { PlatformOperationsAuditService } from '@src/platform-admin/platform-operations-audit/platform.operations.audit.service';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mocked } from 'vitest';
import { DiscussionService } from '../forum-discussion/discussion.service';
import { DiscussionAuthorizationService } from '../forum-discussion/discussion.service.authorization';
import { ForumResolverMutations } from './forum.resolver.mutations';
import { ForumService } from './forum.service';

describe('ForumResolverMutations', () => {
  let resolver: ForumResolverMutations;
  let forumService: Mocked<ForumService>;
  let authorizationService: Mocked<AuthorizationService>;
  let namingService: Mocked<NamingService>;
  let discussionService: Mocked<DiscussionService>;
  let discussionAuthorizationService: Mocked<DiscussionAuthorizationService>;
  let authorizationPolicyService: Mocked<AuthorizationPolicyService>;
  let notificationPlatformAdapter: Mocked<NotificationPlatformAdapter>;
  let platformAuthorizationService: Mocked<PlatformAuthorizationPolicyService>;
  let platformOperationsAuditService: Mocked<PlatformOperationsAuditService>;
  let subscriptionPubSub: any;

  beforeEach(async () => {
    vi.restoreAllMocks();

    subscriptionPubSub = { publish: vi.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ForumResolverMutations,
        MockWinstonProvider,
        {
          provide: SUBSCRIPTION_DISCUSSION_UPDATED,
          useValue: subscriptionPubSub,
        },
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    resolver = module.get(ForumResolverMutations);
    forumService = module.get(ForumService) as Mocked<ForumService>;
    authorizationService = module.get(
      AuthorizationService
    ) as Mocked<AuthorizationService>;
    namingService = module.get(NamingService) as Mocked<NamingService>;
    discussionService = module.get(
      DiscussionService
    ) as Mocked<DiscussionService>;
    discussionAuthorizationService = module.get(
      DiscussionAuthorizationService
    ) as Mocked<DiscussionAuthorizationService>;
    authorizationPolicyService = module.get(
      AuthorizationPolicyService
    ) as Mocked<AuthorizationPolicyService>;
    notificationPlatformAdapter = module.get(
      NotificationPlatformAdapter
    ) as Mocked<NotificationPlatformAdapter>;
    platformAuthorizationService = module.get(
      PlatformAuthorizationPolicyService
    ) as Mocked<PlatformAuthorizationPolicyService>;
    platformOperationsAuditService = module.get(
      PlatformOperationsAuditService
    ) as Mocked<PlatformOperationsAuditService>;
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  describe('createDiscussion', () => {
    const actorContext = { actorID: 'user-1' } as any;
    const forum = {
      id: 'forum-1',
      authorization: { id: 'auth-1' },
    } as any;
    const discussion = {
      id: 'disc-1',
      profile: { displayName: 'Test' },
    } as any;

    const createData = {
      forumID: 'forum-1',
      category: ForumDiscussionCategory.OTHER,
      profile: { displayName: 'Test Discussion' },
    } as any;

    beforeEach(() => {
      forumService.getForumOrFail.mockResolvedValue(forum);
      authorizationService.grantAccessOrFail.mockResolvedValue(
        undefined as any
      );
      namingService.isDiscussionDisplayNameAvailableInForum.mockResolvedValue(
        true
      );
      forumService.createDiscussion.mockResolvedValue(discussion);
      discussionService.save.mockResolvedValue(discussion);
      discussionAuthorizationService.applyAuthorizationPolicy.mockResolvedValue(
        []
      );
      authorizationPolicyService.saveAll.mockResolvedValue(undefined as any);
      notificationPlatformAdapter.platformForumDiscussionCreated.mockResolvedValue(
        undefined as any
      );
      discussionService.getDiscussionOrFail.mockResolvedValue(discussion);
    });

    it('should create a discussion successfully', async () => {
      const result = await resolver.createDiscussion(actorContext, createData);

      expect(result).toBe(discussion);
      expect(forumService.getForumOrFail).toHaveBeenCalledWith('forum-1');
      expect(authorizationService.grantAccessOrFail).toHaveBeenCalled();
      expect(
        namingService.isDiscussionDisplayNameAvailableInForum
      ).toHaveBeenCalledWith('Test Discussion', 'forum-1');
      expect(forumService.createDiscussion).toHaveBeenCalledWith(
        createData,
        'user-1',
        'user-1'
      );
      expect(discussionService.save).toHaveBeenCalledWith(discussion);
      expect(
        discussionAuthorizationService.applyAuthorizationPolicy
      ).toHaveBeenCalled();
      expect(
        notificationPlatformAdapter.platformForumDiscussionCreated
      ).toHaveBeenCalled();
      expect(subscriptionPubSub.publish).toHaveBeenCalled();
    });

    it('should check PLATFORM_ADMIN privilege for RELEASES category', async () => {
      const releasesCreateData = {
        ...createData,
        category: ForumDiscussionCategory.RELEASES,
      };
      const platformAuth = { id: 'plat-auth' } as any;
      platformAuthorizationService.getPlatformAuthorizationPolicy.mockResolvedValue(
        platformAuth
      );

      await resolver.createDiscussion(actorContext, releasesCreateData);

      // Should have been called twice - once for CREATE_DISCUSSION, once for PLATFORM_ADMIN
      expect(authorizationService.grantAccessOrFail).toHaveBeenCalledTimes(2);
    });

    it('should throw ValidationException when display name is taken', async () => {
      namingService.isDiscussionDisplayNameAvailableInForum.mockResolvedValue(
        false
      );

      await expect(
        resolver.createDiscussion(actorContext, createData)
      ).rejects.toThrow(ValidationException);
    });

    it('should check PLATFORM_ADMIN privilege for NEWSLETTER category', async () => {
      const newsletterCreateData = {
        ...createData,
        category: ForumDiscussionCategory.NEWSLETTER,
      };
      const platformAuth = { id: 'plat-auth' } as any;
      platformAuthorizationService.getPlatformAuthorizationPolicy.mockResolvedValue(
        platformAuth
      );

      await resolver.createDiscussion(actorContext, newsletterCreateData);

      expect(authorizationService.grantAccessOrFail).toHaveBeenCalledTimes(2);
    });
  });

  describe('adminForumRemoveDiscussionCategory', () => {
    const actorContext = { actorID: 'admin-1' } as any;
    const removeData = {
      category: ForumDiscussionCategory.OTHER,
    } as any;
    const platformAuth = { id: 'plat-auth' } as any;
    const forum = { id: 'forum-1' } as any;

    beforeEach(() => {
      platformAuthorizationService.getPlatformAuthorizationPolicy.mockResolvedValue(
        platformAuth
      );
      forumService.getPlatformForumOrFail.mockResolvedValue(forum);
      platformOperationsAuditService.recordOperation.mockResolvedValue(
        undefined as any
      );
    });

    it('rejects when the actor lacks PLATFORM_ADMIN and writes no audit row at all', async () => {
      const authError = new Error('not authorized');
      authorizationService.grantAccessOrFail.mockImplementation(() => {
        throw authError;
      });

      await expect(
        resolver.adminForumRemoveDiscussionCategory(actorContext, removeData)
      ).rejects.toThrow(authError);

      // Authorization is checked before the audited block, so a denial must
      // never reach the audit sink or the domain work it gates — an
      // unauthenticated or unauthorized caller gets no DB write and no
      // audit-triggered error log attributable to them.
      expect(forumService.getPlatformForumOrFail).not.toHaveBeenCalled();
      expect(
        platformOperationsAuditService.recordOperation
      ).not.toHaveBeenCalled();
    });

    it('rejects with the not-empty exception and records an audit failure row', async () => {
      authorizationService.grantAccessOrFail.mockResolvedValue(
        undefined as any
      );
      const notEmptyError = new Error('not empty');
      forumService.removeDiscussionCategory.mockRejectedValue(notEmptyError);

      await expect(
        resolver.adminForumRemoveDiscussionCategory(actorContext, removeData)
      ).rejects.toThrow(notEmptyError);

      expect(
        platformOperationsAuditService.recordOperation
      ).toHaveBeenCalledWith(
        expect.objectContaining({ outcome: 'failure', error: notEmptyError })
      );
    });

    it('succeeds, returns the updated Forum, and records an audit success row with the removed flag', async () => {
      authorizationService.grantAccessOrFail.mockResolvedValue(
        undefined as any
      );
      const updatedForum = { id: 'forum-1', discussionCategories: [] } as any;
      forumService.removeDiscussionCategory.mockResolvedValue({
        forum: updatedForum,
        removed: true,
      });

      const result = await resolver.adminForumRemoveDiscussionCategory(
        actorContext,
        removeData
      );

      expect(result).toBe(updatedForum);
      expect(
        platformOperationsAuditService.recordOperation
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          outcome: 'success',
          target: expect.objectContaining({ removed: true }),
        })
      );
    });

    it('succeeds idempotently (removed: false) for an already-absent category, still audited as success', async () => {
      authorizationService.grantAccessOrFail.mockResolvedValue(
        undefined as any
      );
      forumService.removeDiscussionCategory.mockResolvedValue({
        forum,
        removed: false,
      });

      const result = await resolver.adminForumRemoveDiscussionCategory(
        actorContext,
        removeData
      );

      expect(result).toBe(forum);
      expect(
        platformOperationsAuditService.recordOperation
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          outcome: 'success',
          target: expect.objectContaining({ removed: false }),
        })
      );
    });

    it('does not let an audit-recording failure break the mutation (fail-open)', async () => {
      authorizationService.grantAccessOrFail.mockResolvedValue(
        undefined as any
      );
      const updatedForum = { id: 'forum-1' } as any;
      forumService.removeDiscussionCategory.mockResolvedValue({
        forum: updatedForum,
        removed: true,
      });
      platformOperationsAuditService.recordOperation.mockRejectedValue(
        new Error('audit sink unavailable')
      );

      const result = await resolver.adminForumRemoveDiscussionCategory(
        actorContext,
        removeData
      );

      expect(result).toBe(updatedForum);
    });
  });
});
