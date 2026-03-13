import { AuthorizationPrivilege } from '@common/enums';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { PaginationArgs } from '@core/pagination';
import { Test, TestingModule } from '@nestjs/testing';
import { PlatformAuthorizationPolicyService } from '@platform/authorization/platform.authorization.policy.service';
import { MockWinstonProvider } from '@test/mocks';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mocked, vi } from 'vitest';
import { ActivityFeedResolverQueries } from './activity.feed.resolver.queries';
import { ActivityFeedService } from './activity.feed.service';

describe('ActivityFeedResolverQueries', () => {
  let resolver: ActivityFeedResolverQueries;
  let authorizationService: Mocked<AuthorizationService>;
  let platformAuthorizationService: Mocked<PlatformAuthorizationPolicyService>;
  let feedService: Mocked<ActivityFeedService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ActivityFeedResolverQueries, MockWinstonProvider],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    resolver = module.get<ActivityFeedResolverQueries>(
      ActivityFeedResolverQueries
    );
    authorizationService = module.get<AuthorizationService>(
      AuthorizationService
    ) as Mocked<AuthorizationService>;
    platformAuthorizationService =
      module.get<PlatformAuthorizationPolicyService>(
        PlatformAuthorizationPolicyService
      ) as Mocked<PlatformAuthorizationPolicyService>;
    feedService = module.get<ActivityFeedService>(
      ActivityFeedService
    ) as Mocked<ActivityFeedService>;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  describe('activityFeed', () => {
    it('should check authorization with READ_USERS privilege', async () => {
      const actorContext = Object.assign(new ActorContext(), {
        actorID: 'user-1',
      });
      const pagination: PaginationArgs = { first: 10 };
      const mockPolicy = { id: 'platform-auth' } as any;

      platformAuthorizationService.getPlatformAuthorizationPolicy.mockResolvedValue(
        mockPolicy
      );
      feedService.getActivityFeed.mockResolvedValue({
        items: [],
        total: 0,
        pageInfo: { hasNextPage: false, hasPreviousPage: false },
      } as any);

      await resolver.activityFeed(pagination, actorContext);

      expect(authorizationService.grantAccessOrFail).toHaveBeenCalledWith(
        actorContext,
        mockPolicy,
        AuthorizationPrivilege.READ_USERS,
        'Activity feed query: user-1'
      );
    });

    it('should delegate to feedService.getActivityFeed with merged args', async () => {
      const actorContext = Object.assign(new ActorContext(), {
        actorID: 'user-1',
      });
      const pagination: PaginationArgs = { first: 10 };
      const args = { myActivity: true } as any;
      const mockResult = {
        items: [{ id: 'entry-1' }],
        total: 1,
        pageInfo: { hasNextPage: false, hasPreviousPage: false },
      } as any;

      platformAuthorizationService.getPlatformAuthorizationPolicy.mockResolvedValue(
        {} as any
      );
      feedService.getActivityFeed.mockResolvedValue(mockResult);

      const result = await resolver.activityFeed(
        pagination,
        actorContext,
        args
      );

      expect(feedService.getActivityFeed).toHaveBeenCalledWith(actorContext, {
        myActivity: true,
        pagination,
      });
      expect(result).toBe(mockResult);
    });

    it('should work without optional args', async () => {
      const actorContext = Object.assign(new ActorContext(), {
        actorID: 'user-1',
      });
      const pagination: PaginationArgs = {};
      const mockResult = {
        items: [],
        total: 0,
        pageInfo: { hasNextPage: false, hasPreviousPage: false },
      } as any;

      platformAuthorizationService.getPlatformAuthorizationPolicy.mockResolvedValue(
        {} as any
      );
      feedService.getActivityFeed.mockResolvedValue(mockResult);

      const result = await resolver.activityFeed(pagination, actorContext);

      expect(feedService.getActivityFeed).toHaveBeenCalledWith(actorContext, {
        pagination,
      });
      expect(result).toBe(mockResult);
    });
  });

  describe('activityFeedGrouped', () => {
    it('should check authorization with READ_USERS privilege', async () => {
      const actorContext = Object.assign(new ActorContext(), {
        actorID: 'user-2',
      });
      const mockPolicy = { id: 'platform-auth' } as any;

      platformAuthorizationService.getPlatformAuthorizationPolicy.mockResolvedValue(
        mockPolicy
      );
      feedService.getGroupedActivityFeed.mockResolvedValue([]);

      await resolver.activityFeedGrouped(actorContext);

      expect(authorizationService.grantAccessOrFail).toHaveBeenCalledWith(
        actorContext,
        mockPolicy,
        AuthorizationPrivilege.READ_USERS,
        'Activity feed query: user-2'
      );
    });

    it('should delegate to feedService.getGroupedActivityFeed with args', async () => {
      const actorContext = Object.assign(new ActorContext(), {
        actorID: 'user-2',
      });
      const args = { limit: 5, myActivity: true } as any;
      const mockResult = [{ id: 'entry-1' }] as any;

      platformAuthorizationService.getPlatformAuthorizationPolicy.mockResolvedValue(
        {} as any
      );
      feedService.getGroupedActivityFeed.mockResolvedValue(mockResult);

      const result = await resolver.activityFeedGrouped(actorContext, args);

      expect(feedService.getGroupedActivityFeed).toHaveBeenCalledWith(
        actorContext,
        args
      );
      expect(result).toBe(mockResult);
    });

    it('should work without optional args', async () => {
      const actorContext = Object.assign(new ActorContext(), {
        actorID: 'user-2',
      });
      const mockResult: any[] = [];

      platformAuthorizationService.getPlatformAuthorizationPolicy.mockResolvedValue(
        {} as any
      );
      feedService.getGroupedActivityFeed.mockResolvedValue(mockResult);

      const result = await resolver.activityFeedGrouped(actorContext);

      expect(feedService.getGroupedActivityFeed).toHaveBeenCalledWith(
        actorContext,
        undefined
      );
      expect(result).toBe(mockResult);
    });
  });
});
