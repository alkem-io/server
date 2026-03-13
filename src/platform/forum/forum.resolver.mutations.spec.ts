import { SUBSCRIPTION_DISCUSSION_UPDATED } from '@common/constants/providers';
import { ForumDiscussionCategory } from '@common/enums/forum.discussion.category';
import { ValidationException } from '@common/exceptions/validation.exception';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { Test, TestingModule } from '@nestjs/testing';
import { NotificationPlatformAdapter } from '@services/adapters/notification-adapter/notification.platform.adapter';
import { NamingService } from '@services/infrastructure/naming/naming.service';
import { PlatformAuthorizationPolicyService } from '@src/platform/authorization/platform.authorization.policy.service';
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
  });
});
