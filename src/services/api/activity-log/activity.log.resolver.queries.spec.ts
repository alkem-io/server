import { AuthorizationService } from '@core/authorization/authorization.service';
import { CollaborationService } from '@domain/collaboration/collaboration/collaboration.service';
import { createMock } from '@golevelup/ts-vitest';
import { PlatformAuthorizationPolicyService } from '@platform/authorization/platform.authorization.policy.service';
import { ActivityLogResolverQueries } from './activity.log.resolver.queries';
import { ActivityLogService } from './activity.log.service';

const actorContext = { actorID: 'user-1' } as any;

describe('ActivityLogResolverQueries', () => {
  let resolver: ActivityLogResolverQueries;
  let activityLogService: ReturnType<typeof createMock<ActivityLogService>>;
  let authService: ReturnType<typeof createMock<AuthorizationService>>;
  let collaborationService: ReturnType<typeof createMock<CollaborationService>>;
  let platformAuthService: ReturnType<
    typeof createMock<PlatformAuthorizationPolicyService>
  >;
  let logger: any;

  beforeEach(() => {
    activityLogService = createMock<ActivityLogService>();
    authService = createMock<AuthorizationService>();
    collaborationService = createMock<CollaborationService>();
    platformAuthService = createMock<PlatformAuthorizationPolicyService>();
    logger = { verbose: vi.fn(), warn: vi.fn(), error: vi.fn() };

    platformAuthService.getPlatformAuthorizationPolicy.mockResolvedValue(
      {} as any
    );
    collaborationService.getCollaborationOrFail.mockResolvedValue({
      id: 'collab-1',
      authorization: { id: 'auth-collab-1' },
    } as any);
    activityLogService.activityLog.mockResolvedValue([]);

    resolver = new ActivityLogResolverQueries(
      logger,
      activityLogService,
      authService,
      collaborationService,
      platformAuthService
    );
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  it('should query activity log without child collaborations', async () => {
    const queryData = {
      collaborationID: 'collab-1',
      includeChild: false,
    } as any;

    const result = await resolver.activityLogOnCollaboration(
      actorContext,
      queryData
    );

    expect(result).toEqual([]);
    expect(authService.grantAccessOrFail).toHaveBeenCalledTimes(2);
    expect(activityLogService.activityLog).toHaveBeenCalledWith(queryData);
  });

  it('should query activity log with child collaborations', async () => {
    const queryData = {
      collaborationID: 'collab-1',
      includeChild: true,
    } as any;

    collaborationService.getChildCollaborationsOrFail.mockResolvedValue([
      {
        id: 'child-collab-1',
        authorization: { id: 'auth-child-1' },
      } as any,
    ]);

    const result = await resolver.activityLogOnCollaboration(
      actorContext,
      queryData
    );

    expect(result).toEqual([]);
    expect(
      collaborationService.getChildCollaborationsOrFail
    ).toHaveBeenCalledWith('collab-1');
    expect(activityLogService.activityLog).toHaveBeenCalledWith(queryData, [
      'child-collab-1',
    ]);
  });

  it('should filter out child collaborations without read access', async () => {
    const queryData = {
      collaborationID: 'collab-1',
      includeChild: true,
    } as any;

    collaborationService.getChildCollaborationsOrFail.mockResolvedValue([
      {
        id: 'child-collab-1',
        authorization: { id: 'auth-child-1' },
      } as any,
      {
        id: 'child-collab-2',
        authorization: { id: 'auth-child-2' },
      } as any,
    ]);

    // The filter calls grantAccessOrFail synchronously (no await).
    // The filter uses the return value as truthy/falsy.
    // For auth-child-2, throw to simulate denied access.
    authService.grantAccessOrFail.mockImplementation(((
      _actorCtx: any,
      authorization: any
    ) => {
      if (authorization?.id === 'auth-child-2') {
        throw new Error('Access denied');
      }
      return true;
    }) as any);

    const result = await resolver.activityLogOnCollaboration(
      actorContext,
      queryData
    );

    expect(result).toEqual([]);
    expect(activityLogService.activityLog).toHaveBeenCalledWith(queryData, [
      'child-collab-1',
    ]);
  });
});
