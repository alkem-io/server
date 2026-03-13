import { AuthorizationService } from '@core/authorization/authorization.service';
import { CollaborationService } from '@domain/collaboration/collaboration/collaboration.service';
import { createMock } from '@golevelup/ts-vitest';
import { SubscriptionReadService } from '@services/subscriptions/subscription-service';
import { ActivityLogResolverSubscriptions } from './activity.log.resolver.subscriptions';
import { ActivityLogService } from './activity.log.service';

const actorContext = { actorID: 'user-1' } as any;

describe('ActivityLogResolverSubscriptions', () => {
  let resolver: ActivityLogResolverSubscriptions;
  let collaborationService: ReturnType<typeof createMock<CollaborationService>>;
  let authService: ReturnType<typeof createMock<AuthorizationService>>;
  let subscriptionService: ReturnType<
    typeof createMock<SubscriptionReadService>
  >;

  beforeEach(() => {
    const logger = { verbose: vi.fn(), warn: vi.fn(), error: vi.fn() };
    subscriptionService = createMock<SubscriptionReadService>();
    collaborationService = createMock<CollaborationService>();
    authService = createMock<AuthorizationService>();
    const activityLogService = createMock<ActivityLogService>();

    collaborationService.getCollaborationOrFail.mockResolvedValue({
      id: 'collab-1',
      authorization: { id: 'auth-collab-1' },
    } as any);
    subscriptionService.subscribeToActivities.mockReturnValue(
      'async-iterator' as any
    );

    resolver = new ActivityLogResolverSubscriptions(
      logger as any,
      subscriptionService,
      collaborationService,
      authService,
      activityLogService
    );
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  it('should subscribe to activity created with authorization', async () => {
    const input = { collaborationID: 'collab-1' };

    const result = await resolver.activityCreated(actorContext, input as any);

    expect(result).toBe('async-iterator');
    expect(collaborationService.getCollaborationOrFail).toHaveBeenCalledWith(
      'collab-1'
    );
    expect(authService.grantAccessOrFail).toHaveBeenCalled();
    expect(subscriptionService.subscribeToActivities).toHaveBeenCalled();
  });
});
