import { AuthorizationCredential, AuthorizationPrivilege } from '@common/enums';
import { ActivityEventType } from '@common/enums/activity.event.type';
import { SpaceLevel } from '@common/enums/space.level';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { ICredentialDefinition } from '@domain/actor/credential/credential.definition.interface';
import { Space } from '@domain/space/space/space.entity';
import { SpaceLookupService } from '@domain/space/space.lookup/space.lookup.service';
import { LoggerService } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getEntityManagerToken } from '@nestjs/typeorm';
import { ActivityService } from '@platform/activity/activity.service';
import { ActivityLogService } from '@services/api/activity-log';
import { MockWinstonProvider } from '@test/mocks';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { EntityManager } from 'typeorm';
import { type Mocked, vi } from 'vitest';
import { ActivityFeedService } from './activity.feed.service';

function makeSpace(
  id: string,
  level: SpaceLevel,
  collabId: string,
  levelZeroSpaceID = id
): Space {
  return {
    id,
    level,
    levelZeroSpaceID,
    collaboration: {
      id: collabId,
      authorization: { id: `auth-${collabId}` },
    },
  } as unknown as Space;
}

function makeCredential(spaceId: string): ICredentialDefinition {
  return {
    type: AuthorizationCredential.SPACE_MEMBER,
    resourceID: spaceId,
  } as ICredentialDefinition;
}

describe('ActivityFeedService', () => {
  let service: ActivityFeedService;
  let entityManager: Mocked<EntityManager>;
  let authorizationService: Mocked<AuthorizationService>;
  let spaceLookupService: Mocked<SpaceLookupService>;
  let activityService: Mocked<ActivityService>;
  let activityLogService: Mocked<ActivityLogService>;
  let logger: Mocked<LoggerService>;

  beforeEach(async () => {
    vi.restoreAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [ActivityFeedService, MockWinstonProvider],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get<ActivityFeedService>(ActivityFeedService);
    entityManager = module.get<EntityManager>(
      getEntityManagerToken('default')
    ) as Mocked<EntityManager>;
    authorizationService = module.get<AuthorizationService>(
      AuthorizationService
    ) as Mocked<AuthorizationService>;
    spaceLookupService = module.get<SpaceLookupService>(
      SpaceLookupService
    ) as Mocked<SpaceLookupService>;
    activityService = module.get<ActivityService>(
      ActivityService
    ) as Mocked<ActivityService>;
    activityLogService = module.get<ActivityLogService>(
      ActivityLogService
    ) as Mocked<ActivityLogService>;
    logger = module.get<LoggerService>(
      WINSTON_MODULE_NEST_PROVIDER
    ) as Mocked<LoggerService>;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getAllAuthorizedCollaborations (via getActivityFeed)', () => {
    it('should not query DB when no qualifying spaces', async () => {
      const actorContext = Object.assign(new ActorContext(), {
        userID: 'user-1',
        credentials: [],
      });
      spaceLookupService.spacesExist.mockResolvedValue(true);

      await service.getActivityFeed(actorContext, { spaceIds: [] });

      expect(entityManager.find).not.toHaveBeenCalled();
    });

    it('should batch-load spaces with collaborations in a single query for L2 spaces', async () => {
      const actorContext = Object.assign(new ActorContext(), {
        userID: 'user-1',
        credentials: [makeCredential('space-1'), makeCredential('space-2')],
      });
      spaceLookupService.spacesExist.mockResolvedValue(true);

      const space1 = makeSpace('space-1', SpaceLevel.L2, 'collab-1');
      const space2 = makeSpace('space-2', SpaceLevel.L2, 'collab-2');

      entityManager.find.mockResolvedValueOnce([space1, space2]);
      authorizationService.isAccessGranted.mockReturnValue(true);

      await service.getActivityFeed(actorContext, {
        spaceIds: ['space-1', 'space-2'],
      });

      // 1 batch query for spaces (L2 has no children)
      expect(entityManager.find).toHaveBeenCalledTimes(1);
      expect(entityManager.find).toHaveBeenCalledWith(Space, {
        where: { id: expect.anything() },
        relations: { collaboration: true },
      });
    });

    it('should batch-load L0 child spaces in a single additional query', async () => {
      const actorContext = Object.assign(new ActorContext(), {
        userID: 'user-1',
        credentials: [makeCredential('space-l0')],
      });
      spaceLookupService.spacesExist.mockResolvedValue(true);

      const l0Space = makeSpace('space-l0', SpaceLevel.L0, 'collab-l0');
      const childL1 = makeSpace(
        'space-l1',
        SpaceLevel.L1,
        'collab-l1',
        'space-l0'
      );

      entityManager.find
        .mockResolvedValueOnce([l0Space])
        .mockResolvedValueOnce([childL1]);

      authorizationService.isAccessGranted.mockReturnValue(true);

      await service.getActivityFeed(actorContext, {
        spaceIds: ['space-l0'],
      });

      // 2 calls: 1 for parent spaces + 1 for L0 account children
      expect(entityManager.find).toHaveBeenCalledTimes(2);
    });

    it('should batch-load L1 subspaces in a single additional query', async () => {
      const actorContext = Object.assign(new ActorContext(), {
        userID: 'user-1',
        credentials: [makeCredential('space-l1')],
      });
      spaceLookupService.spacesExist.mockResolvedValue(true);

      const l1Space = makeSpace('space-l1', SpaceLevel.L1, 'collab-l1');
      const childL2 = makeSpace('space-l2', SpaceLevel.L2, 'collab-l2');

      entityManager.find
        .mockResolvedValueOnce([l1Space])
        .mockResolvedValueOnce([childL2]);

      authorizationService.isAccessGranted.mockReturnValue(true);

      await service.getActivityFeed(actorContext, {
        spaceIds: ['space-l1'],
      });

      // 2 calls: 1 for parent spaces + 1 for L1 subspaces
      expect(entityManager.find).toHaveBeenCalledTimes(2);
    });

    it('should use isAccessGranted to filter collaborations', async () => {
      const actorContext = Object.assign(new ActorContext(), {
        userID: 'user-1',
        credentials: [makeCredential('space-1'), makeCredential('space-2')],
      });
      spaceLookupService.spacesExist.mockResolvedValue(true);

      const space1 = makeSpace('space-1', SpaceLevel.L2, 'collab-1');
      const space2 = makeSpace('space-2', SpaceLevel.L2, 'collab-2');

      entityManager.find.mockResolvedValueOnce([space1, space2]);
      authorizationService.isAccessGranted
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(false);

      await service.getActivityFeed(actorContext, {
        spaceIds: ['space-1', 'space-2'],
      });

      expect(authorizationService.isAccessGranted).toHaveBeenCalledTimes(2);
      expect(authorizationService.isAccessGranted).toHaveBeenCalledWith(
        actorContext,
        space1.collaboration!.authorization,
        AuthorizationPrivilege.READ
      );
    });

    it('should skip spaces without collaboration', async () => {
      const actorContext = Object.assign(new ActorContext(), {
        userID: 'user-1',
        credentials: [makeCredential('space-no-collab')],
      });
      spaceLookupService.spacesExist.mockResolvedValue(true);

      const spaceNoCollab = {
        id: 'space-no-collab',
        level: SpaceLevel.L2,
        collaboration: undefined,
      } as unknown as Space;

      entityManager.find.mockResolvedValueOnce([spaceNoCollab]);

      await service.getActivityFeed(actorContext, {
        spaceIds: ['space-no-collab'],
      });

      expect(authorizationService.isAccessGranted).not.toHaveBeenCalled();
    });

    it('should deduplicate child collaboration IDs that overlap with parent', async () => {
      const actorContext = Object.assign(new ActorContext(), {
        userID: 'user-1',
        credentials: [makeCredential('space-l0')],
      });
      spaceLookupService.spacesExist.mockResolvedValue(true);

      const l0Space = makeSpace('space-l0', SpaceLevel.L0, 'collab-l0');
      // L0 account query returns the L0 space itself + a child
      const l0SpaceDuplicate = makeSpace(
        'space-l0',
        SpaceLevel.L0,
        'collab-l0',
        'space-l0'
      );
      const childL1 = makeSpace(
        'space-l1',
        SpaceLevel.L1,
        'collab-l1',
        'space-l0'
      );

      entityManager.find
        .mockResolvedValueOnce([l0Space])
        .mockResolvedValueOnce([l0SpaceDuplicate, childL1]);

      authorizationService.isAccessGranted.mockReturnValue(true);

      await service.getActivityFeed(actorContext, {
        spaceIds: ['space-l0'],
      });

      // l0 parent: 1 call, l0 duplicate child: skipped, l1 child: 1 call = 2 total
      expect(authorizationService.isAccessGranted).toHaveBeenCalledTimes(2);
    });

    it('should handle mixed L0 and L1 spaces with 3 batch queries', async () => {
      const actorContext = Object.assign(new ActorContext(), {
        userID: 'user-1',
        credentials: [makeCredential('space-l0'), makeCredential('space-l1')],
      });
      spaceLookupService.spacesExist.mockResolvedValue(true);

      const l0Space = makeSpace('space-l0', SpaceLevel.L0, 'collab-l0');
      const l1Space = makeSpace('space-l1', SpaceLevel.L1, 'collab-l1');
      const l0Child = makeSpace(
        'space-l0-child',
        SpaceLevel.L1,
        'collab-l0-child',
        'space-l0'
      );
      const l1Child = makeSpace('space-l2', SpaceLevel.L2, 'collab-l2');

      entityManager.find
        .mockResolvedValueOnce([l0Space, l1Space]) // parent spaces
        .mockResolvedValueOnce([l0Child]) // L0 children
        .mockResolvedValueOnce([l1Child]); // L1 children

      authorizationService.isAccessGranted.mockReturnValue(true);

      await service.getActivityFeed(actorContext, {
        spaceIds: ['space-l0', 'space-l1'],
      });

      // 3 calls: parent spaces + L0 children + L1 children
      expect(entityManager.find).toHaveBeenCalledTimes(3);
    });
  });

  describe('getActivityFeed', () => {
    function setupForActivityFeed(credentials: ICredentialDefinition[] = []) {
      const actorContext = Object.assign(new ActorContext(), {
        actorID: 'user-1',
        credentials,
      });
      spaceLookupService.spacesExist.mockResolvedValue(true);
      return actorContext;
    }

    it('should call with default filters when no filters provided', async () => {
      const actorContext = setupForActivityFeed();
      activityService.getPaginatedActivity.mockResolvedValue({
        items: [],
        total: 0,
        pageInfo: { hasNextPage: false, hasPreviousPage: false },
      } as any);
      activityLogService.convertRawActivityToResults.mockResolvedValue([]);

      await service.getActivityFeed(actorContext);

      expect(activityService.getPaginatedActivity).toHaveBeenCalledWith(
        [],
        expect.objectContaining({
          types: [],
          userID: undefined,
          visibility: true,
          sort: 'DESC',
        })
      );
    });

    it('should pass actorID as userID when myActivity is true', async () => {
      const actorContext = setupForActivityFeed();
      activityService.getPaginatedActivity.mockResolvedValue({
        items: [],
        total: 0,
        pageInfo: { hasNextPage: false, hasPreviousPage: false },
      } as any);
      activityLogService.convertRawActivityToResults.mockResolvedValue([]);

      await service.getActivityFeed(actorContext, { myActivity: true });

      expect(activityService.getPaginatedActivity).toHaveBeenCalledWith(
        [],
        expect.objectContaining({
          userID: 'user-1',
        })
      );
    });

    it('should pass undefined userID when myActivity is false', async () => {
      const actorContext = setupForActivityFeed();
      activityService.getPaginatedActivity.mockResolvedValue({
        items: [],
        total: 0,
        pageInfo: { hasNextPage: false, hasPreviousPage: false },
      } as any);
      activityLogService.convertRawActivityToResults.mockResolvedValue([]);

      await service.getActivityFeed(actorContext, { myActivity: false });

      expect(activityService.getPaginatedActivity).toHaveBeenCalledWith(
        [],
        expect.objectContaining({
          userID: undefined,
        })
      );
    });

    it('should pass types and excludeTypes filters through', async () => {
      const actorContext = setupForActivityFeed();
      activityService.getPaginatedActivity.mockResolvedValue({
        items: [],
        total: 0,
        pageInfo: { hasNextPage: false, hasPreviousPage: false },
      } as any);
      activityLogService.convertRawActivityToResults.mockResolvedValue([]);

      await service.getActivityFeed(actorContext, {
        types: [ActivityEventType.CALLOUT_PUBLISHED],
        excludeTypes: [ActivityEventType.MEMBER_JOINED],
      });

      expect(activityService.getPaginatedActivity).toHaveBeenCalledWith(
        [],
        expect.objectContaining({
          types: [ActivityEventType.CALLOUT_PUBLISHED],
          excludeTypes: [ActivityEventType.MEMBER_JOINED],
        })
      );
    });

    it('should return paginated result with converted activities', async () => {
      const actorContext = setupForActivityFeed();
      const mockEntry = { id: 'entry-1', type: 'test' };
      activityService.getPaginatedActivity.mockResolvedValue({
        items: [{ id: 'raw-1' }],
        total: 1,
        pageInfo: { hasNextPage: false, hasPreviousPage: false },
      } as any);
      activityLogService.convertRawActivityToResults.mockResolvedValue([
        mockEntry as any,
      ]);

      const result = await service.getActivityFeed(actorContext);

      expect(result).toEqual({
        total: 1,
        pageInfo: { hasNextPage: false, hasPreviousPage: false },
        items: [mockEntry],
      });
    });

    it('should filter out undefined entries from converted activities', async () => {
      const actorContext = setupForActivityFeed();
      activityService.getPaginatedActivity.mockResolvedValue({
        items: [{ id: 'raw-1' }, { id: 'raw-2' }],
        total: 2,
        pageInfo: { hasNextPage: false, hasPreviousPage: false },
      } as any);
      activityLogService.convertRawActivityToResults.mockResolvedValue([
        { id: 'entry-1' } as any,
        undefined as any,
      ]);

      const result = await service.getActivityFeed(actorContext);

      expect(result.items).toHaveLength(1);
    });
  });

  describe('getGroupedActivityFeed', () => {
    function setupForGroupedFeed(credentials: ICredentialDefinition[] = []) {
      const actorContext = Object.assign(new ActorContext(), {
        actorID: 'user-1',
        credentials,
      });
      spaceLookupService.spacesExist.mockResolvedValue(true);
      return actorContext;
    }

    it('should call getGroupedActivity with default limit of 10', async () => {
      const actorContext = setupForGroupedFeed();
      const mockEntries = Array.from({ length: 10 }, (_, i) => ({
        id: `entry-${i}`,
      }));
      activityService.getGroupedActivity.mockResolvedValue(mockEntries as any);
      activityLogService.convertRawActivityToResults.mockResolvedValue(
        mockEntries as any
      );

      await service.getGroupedActivityFeed(actorContext);

      expect(activityService.getGroupedActivity).toHaveBeenCalledWith(
        [],
        expect.objectContaining({
          limit: 10,
          sort: 'DESC',
          visibility: true,
        })
      );
    });

    it('should pass custom limit', async () => {
      const actorContext = setupForGroupedFeed();
      const mockEntries = Array.from({ length: 5 }, (_, i) => ({
        id: `entry-${i}`,
      }));
      activityService.getGroupedActivity.mockResolvedValue(mockEntries as any);
      activityLogService.convertRawActivityToResults.mockResolvedValue(
        mockEntries as any
      );

      await service.getGroupedActivityFeed(actorContext, { limit: 5 });

      expect(activityService.getGroupedActivity).toHaveBeenCalledWith(
        [],
        expect.objectContaining({
          limit: 5,
        })
      );
    });

    it('should pass actorID as userID when myActivity is true', async () => {
      const actorContext = setupForGroupedFeed();
      const mockEntries = Array.from({ length: 10 }, (_, i) => ({
        id: `entry-${i}`,
      }));
      activityService.getGroupedActivity.mockResolvedValue(mockEntries as any);
      activityLogService.convertRawActivityToResults.mockResolvedValue(
        mockEntries as any
      );

      await service.getGroupedActivityFeed(actorContext, {
        myActivity: true,
      });

      expect(activityService.getGroupedActivity).toHaveBeenCalledWith(
        [],
        expect.objectContaining({
          userID: 'user-1',
        })
      );
    });

    it('should retry when converted activities are fewer than requested', async () => {
      const actorContext = setupForGroupedFeed();
      // First call: request 10, get 10 raw, but only 7 convert
      activityService.getGroupedActivity
        .mockResolvedValueOnce(
          Array.from({ length: 10 }, (_, i) => ({ id: `raw-${i}` })) as any
        )
        .mockResolvedValueOnce(
          Array.from({ length: 13 }, (_, i) => ({
            id: `raw-retry-${i}`,
          })) as any
        );
      activityLogService.convertRawActivityToResults
        .mockResolvedValueOnce([
          ...Array.from({ length: 7 }, (_, i) => ({
            id: `entry-${i}`,
          })),
          undefined,
          undefined,
          undefined,
        ] as any)
        .mockResolvedValueOnce(
          Array.from({ length: 13 }, (_, i) => ({
            id: `entry-retry-${i}`,
          })) as any
        );

      const result = await service.getGroupedActivityFeed(actorContext);

      // Should have retried
      expect(activityService.getGroupedActivity).toHaveBeenCalledTimes(2);
      // Second call with increased limit (10 + 3 difference)
      expect(activityService.getGroupedActivity).toHaveBeenNthCalledWith(
        2,
        [],
        expect.objectContaining({
          limit: 13,
        })
      );
      expect(result).toHaveLength(13);
    });

    it('should break at hard limit of 100 requested activities', async () => {
      const actorContext = setupForGroupedFeed();
      // Always return fewer converted than raw to force retries
      activityService.getGroupedActivity.mockImplementation(
        async (_collabIds, opts) => {
          return Array.from({ length: opts?.limit ?? 10 }, (_, i) => ({
            id: `raw-${i}`,
          })) as any;
        }
      );
      activityLogService.convertRawActivityToResults.mockImplementation(
        async raw => {
          // Always return half - forcing continuous retries
          return Array.from({ length: Math.floor(raw.length / 2) }, (_, i) => ({
            id: `entry-${i}`,
          })) as any;
        }
      );

      await service.getGroupedActivityFeed(actorContext, { limit: 10 });

      // Should have stopped retrying once requestedActivitiesNumber > 100
      const lastCall =
        activityService.getGroupedActivity.mock.calls[
          activityService.getGroupedActivity.mock.calls.length - 1
        ];
      // The last call's limit should be <= 100
      // (the loop breaks when the NEXT iteration would exceed 100)
      expect(lastCall[1]?.limit).toBeLessThanOrEqual(100);
    });

    it('should filter out undefined entries from converted activities', async () => {
      const actorContext = setupForGroupedFeed();
      activityService.getGroupedActivity.mockResolvedValue([
        { id: 'raw-1' },
        { id: 'raw-2' },
      ] as any);
      activityLogService.convertRawActivityToResults.mockResolvedValue([
        { id: 'entry-1' } as any,
        undefined as any,
        { id: 'entry-2' } as any,
        undefined as any,
        { id: 'entry-3' } as any,
        undefined as any,
        { id: 'entry-4' } as any,
        undefined as any,
        { id: 'entry-5' } as any,
        undefined as any,
        { id: 'entry-6' } as any,
        undefined as any,
        { id: 'entry-7' } as any,
        undefined as any,
        { id: 'entry-8' } as any,
        undefined as any,
        { id: 'entry-9' } as any,
        undefined as any,
        { id: 'entry-10' } as any,
        undefined as any,
      ]);

      const result = await service.getGroupedActivityFeed(actorContext);

      // Should contain only defined entries
      result.forEach(entry => {
        expect(entry).toBeDefined();
      });
    });
  });

  describe('filterSpacesOrFail (via getActivityFeed)', () => {
    it('should warn and filter out non-existing spaces', async () => {
      const actorContext = Object.assign(new ActorContext(), {
        actorID: 'user-1',
        credentials: [
          makeCredential('space-1'),
          makeCredential('space-2'),
          makeCredential('space-3'),
        ],
      });
      // spacesExist returns array of non-existing space IDs
      spaceLookupService.spacesExist.mockResolvedValue(['space-2']);
      activityService.getPaginatedActivity.mockResolvedValue({
        items: [],
        total: 0,
        pageInfo: { hasNextPage: false, hasPreviousPage: false },
      } as any);
      activityLogService.convertRawActivityToResults.mockResolvedValue([]);

      // Only space-1 and space-3 should pass through (space-2 is non-existing)
      const space1 = makeSpace('space-1', SpaceLevel.L2, 'collab-1');
      const space3 = makeSpace('space-3', SpaceLevel.L2, 'collab-3');
      entityManager.find.mockResolvedValueOnce([space1, space3]);
      authorizationService.isAccessGranted.mockReturnValue(true);

      await service.getActivityFeed(actorContext, {
        spaceIds: ['space-1', 'space-2', 'space-3'],
      });

      expect(logger.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          message:
            'Some Spaces were not found when filtering for the activity feed',
          spaceIds: ['space-2'],
        }),
        expect.any(String)
      );
    });

    it('should return all spaces when no spaceIds filter is provided', async () => {
      const actorContext = Object.assign(new ActorContext(), {
        actorID: 'user-1',
        credentials: [makeCredential('space-1'), makeCredential('space-2')],
      });
      spaceLookupService.spacesExist.mockResolvedValue(true);

      const space1 = makeSpace('space-1', SpaceLevel.L2, 'collab-1');
      const space2 = makeSpace('space-2', SpaceLevel.L2, 'collab-2');
      entityManager.find.mockResolvedValueOnce([space1, space2]);
      authorizationService.isAccessGranted.mockReturnValue(true);
      activityService.getPaginatedActivity.mockResolvedValue({
        items: [],
        total: 0,
        pageInfo: { hasNextPage: false, hasPreviousPage: false },
      } as any);
      activityLogService.convertRawActivityToResults.mockResolvedValue([]);

      // No spaceIds filter - should use all credential spaces
      await service.getActivityFeed(actorContext);

      // Both spaces should be queried
      expect(entityManager.find).toHaveBeenCalledTimes(1);
    });
  });

  describe('filterSpacesByRoles (via getActivityFeed with roles filter)', () => {
    it('should return only spaces with matching roles', async () => {
      const actorContext = Object.assign(new ActorContext(), {
        actorID: 'user-1',
        credentials: [
          {
            type: AuthorizationCredential.SPACE_ADMIN,
            resourceID: 'space-admin',
          } as ICredentialDefinition,
          {
            type: AuthorizationCredential.SPACE_MEMBER,
            resourceID: 'space-member',
          } as ICredentialDefinition,
        ],
      });
      spaceLookupService.spacesExist.mockResolvedValue(true);
      activityService.getPaginatedActivity.mockResolvedValue({
        items: [],
        total: 0,
        pageInfo: { hasNextPage: false, hasPreviousPage: false },
      } as any);
      activityLogService.convertRawActivityToResults.mockResolvedValue([]);

      const spaceAdmin = makeSpace(
        'space-admin',
        SpaceLevel.L2,
        'collab-admin'
      );
      entityManager.find.mockResolvedValueOnce([spaceAdmin]);
      authorizationService.isAccessGranted.mockReturnValue(true);

      // Filter to admin role only - should exclude space-member
      await service.getActivityFeed(actorContext, {
        roles: ['admin' as any],
      });

      // Only space-admin should pass the roles filter
      expect(entityManager.find).toHaveBeenCalledTimes(1);
    });

    it('should return all spaces when roles filter is empty', async () => {
      const actorContext = Object.assign(new ActorContext(), {
        actorID: 'user-1',
        credentials: [makeCredential('space-1'), makeCredential('space-2')],
      });
      spaceLookupService.spacesExist.mockResolvedValue(true);
      activityService.getPaginatedActivity.mockResolvedValue({
        items: [],
        total: 0,
        pageInfo: { hasNextPage: false, hasPreviousPage: false },
      } as any);
      activityLogService.convertRawActivityToResults.mockResolvedValue([]);

      const space1 = makeSpace('space-1', SpaceLevel.L2, 'collab-1');
      const space2 = makeSpace('space-2', SpaceLevel.L2, 'collab-2');
      entityManager.find.mockResolvedValueOnce([space1, space2]);
      authorizationService.isAccessGranted.mockReturnValue(true);

      await service.getActivityFeed(actorContext, { roles: [] });

      // Both spaces should pass through with empty roles filter
      expect(entityManager.find).toHaveBeenCalledTimes(1);
      expect(authorizationService.isAccessGranted).toHaveBeenCalledTimes(2);
    });
  });
});
