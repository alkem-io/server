import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockNotificationsService } from '@test/mocks/notifications.service.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mock } from 'vitest';
import { DiscussionResolverMutations } from './discussion.resolver.mutations';
import { DiscussionService } from './discussion.service';

describe('DiscussionResolver', () => {
  let resolver: DiscussionResolverMutations;
  let authorizationService: AuthorizationService;
  let discussionService: DiscussionService;

  const mockActorContext = { actorID: 'actor-1' } as ActorContext;
  const mockDiscussion = {
    id: 'discussion-1',
    authorization: { id: 'auth-discussion-1' },
  };

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
    authorizationService = module.get(AuthorizationService);
    discussionService = module.get(DiscussionService);

    (discussionService.getDiscussionOrFail as Mock).mockResolvedValue(
      mockDiscussion
    );
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  // 027-platform-role-redesign (spec-server-9 fix): A15's forum family is
  // gated SOLELY on PLATFORM_FORUM_MANAGE (corr-server-7/spec-server-7 fix)
  // — assert the gate directly rather than only that the resolver
  // constructs, so re-gating this back onto bare UPDATE/DELETE (or
  // re-adding a dual-CRUD-owner branch) fails this spec.
  describe('deleteDiscussion — gated on PLATFORM_FORUM_MANAGE', () => {
    it('checks PLATFORM_FORUM_MANAGE, not a bare CRUD privilege', async () => {
      (authorizationService.grantAccessOrFail as Mock).mockReturnValue(
        undefined
      );
      (discussionService.removeDiscussion as Mock).mockResolvedValue(
        mockDiscussion
      );

      await resolver.deleteDiscussion(mockActorContext, {
        ID: mockDiscussion.id,
      } as any);

      expect(authorizationService.grantAccessOrFail).toHaveBeenCalledWith(
        mockActorContext,
        mockDiscussion.authorization,
        AuthorizationPrivilege.PLATFORM_FORUM_MANAGE,
        expect.any(String)
      );
      expect(authorizationService.grantAccessOrFail).not.toHaveBeenCalledWith(
        mockActorContext,
        mockDiscussion.authorization,
        AuthorizationPrivilege.DELETE,
        expect.any(String)
      );
    });

    it('denies a caller lacking PLATFORM_FORUM_MANAGE and does not delete', async () => {
      (authorizationService.grantAccessOrFail as Mock).mockImplementation(
        () => {
          throw new Error('Forbidden');
        }
      );

      await expect(
        resolver.deleteDiscussion(mockActorContext, {
          ID: mockDiscussion.id,
        } as any)
      ).rejects.toThrow('Forbidden');

      expect(discussionService.removeDiscussion).not.toHaveBeenCalled();
    });
  });

  describe('updateDiscussion — gated on PLATFORM_FORUM_MANAGE', () => {
    beforeEach(() => {
      (discussionService.getDiscussionOrFail as Mock).mockResolvedValue({
        ...mockDiscussion,
        profile: {},
        comments: {},
      });
    });

    it('checks PLATFORM_FORUM_MANAGE, not a bare CRUD privilege', async () => {
      (authorizationService.grantAccessOrFail as Mock).mockReturnValue(
        undefined
      );
      (discussionService.updateDiscussion as Mock).mockResolvedValue(
        mockDiscussion
      );

      await resolver.updateDiscussion(mockActorContext, {
        ID: mockDiscussion.id,
      } as any);

      expect(authorizationService.grantAccessOrFail).toHaveBeenCalledWith(
        mockActorContext,
        mockDiscussion.authorization,
        AuthorizationPrivilege.PLATFORM_FORUM_MANAGE,
        expect.any(String)
      );
      expect(authorizationService.grantAccessOrFail).not.toHaveBeenCalledWith(
        mockActorContext,
        mockDiscussion.authorization,
        AuthorizationPrivilege.UPDATE,
        expect.any(String)
      );
    });

    it('denies a caller lacking PLATFORM_FORUM_MANAGE and does not update', async () => {
      (authorizationService.grantAccessOrFail as Mock).mockImplementation(
        () => {
          throw new Error('Forbidden');
        }
      );

      await expect(
        resolver.updateDiscussion(mockActorContext, {
          ID: mockDiscussion.id,
        } as any)
      ).rejects.toThrow('Forbidden');

      expect(discussionService.updateDiscussion).not.toHaveBeenCalled();
    });
  });
});
