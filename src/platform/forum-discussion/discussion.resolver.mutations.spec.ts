import { ForumDiscussionCategory } from '@common/enums/forum.discussion.category';
import { EntityNotFoundException } from '@common/exceptions';
import { ForumDiscussionCategoryException } from '@common/exceptions/forum.discussion.category.exception';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { Test, TestingModule } from '@nestjs/testing';
import { PlatformAuthorizationPolicyService } from '@src/platform/authorization/platform.authorization.policy.service';
import { PlatformOperationsAuditService } from '@src/platform-admin/platform-operations-audit/platform.operations.audit.service';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockNotificationsService } from '@test/mocks/notifications.service.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mocked } from 'vitest';
import { DiscussionResolverMutations } from './discussion.resolver.mutations';
import { DiscussionService } from './discussion.service';

describe('DiscussionResolverMutations', () => {
  let resolver: DiscussionResolverMutations;
  let authorizationService: Mocked<AuthorizationService>;
  let discussionService: Mocked<DiscussionService>;
  let platformAuthorizationService: Mocked<PlatformAuthorizationPolicyService>;
  let platformOperationsAuditService: Mocked<PlatformOperationsAuditService>;

  beforeEach(async () => {
    vi.restoreAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DiscussionResolverMutations,
        MockCacheManager,
        MockWinstonProvider,
        MockNotificationsService,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    resolver = module.get(DiscussionResolverMutations);
    authorizationService = module.get(
      AuthorizationService
    ) as Mocked<AuthorizationService>;
    discussionService = module.get(
      DiscussionService
    ) as Mocked<DiscussionService>;
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

  describe('updateDiscussion', () => {
    const actorContext = { actorID: 'admin-1' } as any;
    const baseDiscussion = {
      id: 'disc-1',
      nameID: 'my-discussion',
      category: ForumDiscussionCategory.OTHER,
      authorization: { id: 'auth-1' },
      forum: {
        id: 'forum-1',
        discussionCategories: [
          ForumDiscussionCategory.OTHER,
          ForumDiscussionCategory.HELP,
          ForumDiscussionCategory.NEWSLETTER,
        ],
      },
    } as any;

    beforeEach(() => {
      discussionService.getDiscussionOrFail.mockResolvedValue({
        ...baseDiscussion,
      });
      authorizationService.grantAccessOrFail.mockResolvedValue(
        undefined as any
      );
      platformOperationsAuditService.recordOperation.mockResolvedValue(
        undefined as any
      );
    });

    it('loads the discussion with its forum relation', async () => {
      discussionService.updateDiscussion.mockResolvedValue({
        ...baseDiscussion,
      });

      await resolver.updateDiscussion(actorContext, {
        ID: 'disc-1',
      } as any);

      expect(discussionService.getDiscussionOrFail).toHaveBeenCalledWith(
        'disc-1',
        { relations: { profile: true, comments: true, forum: true } }
      );
    });

    it('passes an ordinary in-list category change through unchanged', async () => {
      const updated = {
        ...baseDiscussion,
        category: ForumDiscussionCategory.HELP,
      };
      discussionService.updateDiscussion.mockResolvedValue(updated);

      const result = await resolver.updateDiscussion(actorContext, {
        ID: 'disc-1',
        category: ForumDiscussionCategory.HELP,
      } as any);

      expect(result).toBe(updated);
      expect(discussionService.updateDiscussion).toHaveBeenCalled();
    });

    it('rejects a category not on the forum active list', async () => {
      await expect(
        resolver.updateDiscussion(actorContext, {
          ID: 'disc-1',
          category: ForumDiscussionCategory.PLATFORM_FUNCTIONALITIES,
        } as any)
      ).rejects.toThrow(ForumDiscussionCategoryException);

      expect(discussionService.updateDiscussion).not.toHaveBeenCalled();
    });

    it('requires PLATFORM_ADMIN to move a discussion into NEWSLETTER', async () => {
      const platformAuth = { id: 'plat-auth' } as any;
      platformAuthorizationService.getPlatformAuthorizationPolicy.mockResolvedValue(
        platformAuth
      );
      discussionService.updateDiscussion.mockResolvedValue({
        ...baseDiscussion,
        category: ForumDiscussionCategory.NEWSLETTER,
      });

      await resolver.updateDiscussion(actorContext, {
        ID: 'disc-1',
        category: ForumDiscussionCategory.NEWSLETTER,
      } as any);

      // Called twice: once for UPDATE on the discussion, once for
      // PLATFORM_ADMIN on the platform policy.
      expect(authorizationService.grantAccessOrFail).toHaveBeenCalledTimes(2);
    });

    it('denies the move into NEWSLETTER when PLATFORM_ADMIN is refused', async () => {
      const platformAuth = { id: 'plat-auth' } as any;
      platformAuthorizationService.getPlatformAuthorizationPolicy.mockResolvedValue(
        platformAuth
      );
      const authError = new Error('not authorized');
      authorizationService.grantAccessOrFail
        .mockResolvedValueOnce(undefined as any) // UPDATE on the discussion
        .mockImplementationOnce(() => {
          throw authError;
        });

      await expect(
        resolver.updateDiscussion(actorContext, {
          ID: 'disc-1',
          category: ForumDiscussionCategory.NEWSLETTER,
        } as any)
      ).rejects.toThrow(authError);

      expect(discussionService.updateDiscussion).not.toHaveBeenCalled();
    });

    it('throws when the discussion has no loaded forum and a category change is requested', async () => {
      discussionService.getDiscussionOrFail.mockResolvedValue({
        ...baseDiscussion,
        forum: undefined,
      });

      await expect(
        resolver.updateDiscussion(actorContext, {
          ID: 'disc-1',
          category: ForumDiscussionCategory.HELP,
        } as any)
      ).rejects.toThrow(EntityNotFoundException);
    });

    it('records an audit row with actor, from, and to when the category actually changes', async () => {
      discussionService.updateDiscussion.mockResolvedValue({
        ...baseDiscussion,
        category: ForumDiscussionCategory.HELP,
      });

      await resolver.updateDiscussion(actorContext, {
        ID: 'disc-1',
        category: ForumDiscussionCategory.HELP,
      } as any);

      expect(
        platformOperationsAuditService.recordOperation
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          actorID: 'admin-1',
          action: 'updateDiscussionCategory',
          outcome: 'success',
          target: expect.objectContaining({
            discussionID: 'disc-1',
            from: ForumDiscussionCategory.OTHER,
            to: ForumDiscussionCategory.HELP,
          }),
        })
      );
    });

    it('does not record an audit row when category is absent from the update', async () => {
      discussionService.updateDiscussion.mockResolvedValue({
        ...baseDiscussion,
      });

      await resolver.updateDiscussion(actorContext, {
        ID: 'disc-1',
        profileData: { displayName: 'New name' },
      } as any);

      expect(
        platformOperationsAuditService.recordOperation
      ).not.toHaveBeenCalled();
    });

    it('does not record an audit row when the category is unchanged', async () => {
      discussionService.updateDiscussion.mockResolvedValue({
        ...baseDiscussion,
      });

      await resolver.updateDiscussion(actorContext, {
        ID: 'disc-1',
        category: ForumDiscussionCategory.OTHER,
      } as any);

      expect(
        platformOperationsAuditService.recordOperation
      ).not.toHaveBeenCalled();
    });

    it('still succeeds when the audit service rejects (fail-open)', async () => {
      const updated = {
        ...baseDiscussion,
        category: ForumDiscussionCategory.HELP,
      };
      discussionService.updateDiscussion.mockResolvedValue(updated);
      platformOperationsAuditService.recordOperation.mockRejectedValue(
        new Error('audit sink unavailable')
      );

      const result = await resolver.updateDiscussion(actorContext, {
        ID: 'disc-1',
        category: ForumDiscussionCategory.HELP,
      } as any);

      expect(result).toBe(updated);
    });
  });
});
