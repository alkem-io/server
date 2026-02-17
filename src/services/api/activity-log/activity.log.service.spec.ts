import { ActivityEventType } from '@common/enums/activity.event.type';
import { CalloutService } from '@domain/collaboration/callout/callout.service';
import { IUser } from '@domain/community/user/user.interface';
import { UserService } from '@domain/community/user/user.service';
import { UserLookupService } from '@domain/community/user-lookup/user.lookup.service';
import { Space } from '@domain/space/space/space.entity';
import { ISpace } from '@domain/space/space/space.interface';
import { Test, TestingModule } from '@nestjs/testing';
import { getEntityManagerToken } from '@nestjs/typeorm';
import { IActivity } from '@platform/activity/activity.interface';
import { CommunityResolverService } from '@services/infrastructure/entity-resolver/community.resolver.service';
import { ActivityService } from '@src/platform/activity/activity.service';
import { MockWinstonProvider } from '@test/mocks';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { EntityManager } from 'typeorm';
import { type Mocked, vi } from 'vitest';
import { ActivityLogService } from './activity.log.service';
import { ActivityLogInput } from './dto/activity.log.dto.collaboration.input';
import { IActivityLogEntry } from './dto/activity.log.entry.interface';

function makeUser(id: string): IUser {
  return { id, email: `${id}@example.com` } as unknown as IUser;
}

function makeSpace(collabId: string, displayName: string): Space {
  return {
    id: `space-for-${collabId}`,
    nameID: `space-${collabId}`,
    collaboration: { id: collabId },
    about: { profile: { displayName } },
    community: { id: `community-${collabId}` },
  } as unknown as Space;
}

function makeRawActivity(
  id: string,
  collaborationID: string,
  triggeredBy: string,
  type: ActivityEventType = ActivityEventType.CALLOUT_PUBLISHED
): IActivity {
  return {
    id,
    collaborationID,
    triggeredBy,
    resourceID: `resource-${id}`,
    type,
    createdDate: new Date('2024-01-01'),
    visibility: true,
    child: false,
  } as unknown as IActivity;
}

describe('ActivityLogService', () => {
  let service: ActivityLogService;
  let entityManager: Mocked<EntityManager>;
  let userLookupService: Mocked<UserLookupService>;
  let userService: Mocked<UserService>;
  let communityResolverService: Mocked<CommunityResolverService>;
  let activityService: Mocked<ActivityService>;
  let calloutService: Mocked<CalloutService>;
  let logger: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ActivityLogService, MockWinstonProvider],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get<ActivityLogService>(ActivityLogService);
    entityManager = module.get<EntityManager>(
      getEntityManagerToken('default')
    ) as Mocked<EntityManager>;
    userLookupService = module.get<UserLookupService>(
      UserLookupService
    ) as Mocked<UserLookupService>;
    userService = module.get<UserService>(UserService) as Mocked<UserService>;
    communityResolverService = module.get<CommunityResolverService>(
      CommunityResolverService
    ) as Mocked<CommunityResolverService>;
    activityService = module.get<ActivityService>(
      ActivityService
    ) as Mocked<ActivityService>;
    calloutService = module.get<CalloutService>(
      CalloutService
    ) as Mocked<CalloutService>;
    logger = module.get(WINSTON_MODULE_NEST_PROVIDER);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('convertRawActivityToResults', () => {
    it('should return empty array for empty input', async () => {
      const result = await service.convertRawActivityToResults([]);

      expect(result).toEqual([]);
      expect(entityManager.find).not.toHaveBeenCalled();
      expect(userLookupService.getUsersByUUID).not.toHaveBeenCalled();
    });

    it('should batch-load spaces and users with single queries each', async () => {
      const user1 = makeUser('user-1');
      const user2 = makeUser('user-2');
      const space1 = makeSpace('collab-1', 'Space One');
      const space2 = makeSpace('collab-2', 'Space Two');

      const rawActivities = [
        makeRawActivity('act-1', 'collab-1', 'user-1'),
        makeRawActivity('act-2', 'collab-2', 'user-2'),
        makeRawActivity('act-3', 'collab-1', 'user-1'),
      ];

      // Batch space load
      entityManager.find.mockResolvedValueOnce([space1, space2]);
      // Batch user load
      userLookupService.getUsersByUUID.mockResolvedValueOnce([user1, user2]);

      await service.convertRawActivityToResults(rawActivities);

      // 1 batch query for spaces
      expect(entityManager.find).toHaveBeenCalledTimes(1);
      expect(entityManager.find).toHaveBeenCalledWith(Space, {
        where: { collaboration: { id: expect.anything() } },
        relations: {
          collaboration: true,
          about: { profile: true },
          community: true,
        },
      });

      // 1 batch query for users
      expect(userLookupService.getUsersByUUID).toHaveBeenCalledTimes(1);
      // Should deduplicate user IDs
      expect(userLookupService.getUsersByUUID).toHaveBeenCalledWith(
        expect.arrayContaining(['user-1', 'user-2'])
      );

      // Should NOT call individual user/space lookups
      expect(userService.getUserOrFail).not.toHaveBeenCalled();
      expect(
        communityResolverService.getSpaceForCollaborationOrFail
      ).not.toHaveBeenCalled();
    });

    it('should deduplicate collaboration IDs and user IDs', async () => {
      const user1 = makeUser('user-1');
      const space1 = makeSpace('collab-1', 'Space One');

      // Three activities with the same collaboration and user
      const rawActivities = [
        makeRawActivity('act-1', 'collab-1', 'user-1'),
        makeRawActivity('act-2', 'collab-1', 'user-1'),
        makeRawActivity('act-3', 'collab-1', 'user-1'),
      ];

      entityManager.find.mockResolvedValueOnce([space1]);
      userLookupService.getUsersByUUID.mockResolvedValueOnce([user1]);

      await service.convertRawActivityToResults(rawActivities);

      // Still just 1 query each, not 3
      expect(entityManager.find).toHaveBeenCalledTimes(1);
      expect(userLookupService.getUsersByUUID).toHaveBeenCalledTimes(1);
      expect(userLookupService.getUsersByUUID).toHaveBeenCalledWith(['user-1']);
    });

    it('should skip MEMBER_JOINED activities without parentID', async () => {
      const user1 = makeUser('user-1');
      const space1 = makeSpace('collab-1', 'Space One');

      const rawActivities = [
        {
          ...makeRawActivity(
            'act-1',
            'collab-1',
            'user-1',
            ActivityEventType.MEMBER_JOINED
          ),
          parentID: undefined,
        },
      ];

      entityManager.find.mockResolvedValueOnce([space1]);
      userLookupService.getUsersByUUID.mockResolvedValueOnce([user1]);

      const result = await service.convertRawActivityToResults(
        rawActivities as IActivity[]
      );

      // Should return undefined for the MEMBER_JOINED activity without parentID
      expect(result).toHaveLength(1);
      expect(result[0]).toBeUndefined();
    });
  });

  describe('convertRawActivityToResult', () => {
    it('should use pre-loaded maps when provided', async () => {
      const user = makeUser('user-1');
      const space = makeSpace('collab-1', 'Space One');

      const spaceMap = new Map<string, ISpace>([
        ['collab-1', space as unknown as ISpace],
      ]);
      const userMap = new Map<string, IUser>([['user-1', user]]);

      const rawActivity = makeRawActivity('act-1', 'collab-1', 'user-1');

      await service.convertRawActivityToResult(rawActivity, spaceMap, userMap);

      // Should NOT call individual lookups when maps are provided
      expect(userService.getUserOrFail).not.toHaveBeenCalled();
      expect(
        communityResolverService.getSpaceForCollaborationOrFail
      ).not.toHaveBeenCalled();
    });

    it('should fall back to individual queries when maps are not provided', async () => {
      const user = makeUser('user-1');
      const space = makeSpace('collab-1', 'Space One');

      userService.getUserOrFail.mockResolvedValueOnce(user);
      communityResolverService.getSpaceForCollaborationOrFail.mockResolvedValueOnce(
        space as unknown as ISpace
      );

      const rawActivity = makeRawActivity('act-1', 'collab-1', 'user-1');

      await service.convertRawActivityToResult(rawActivity);

      // Should use individual lookups as fallback
      expect(userService.getUserOrFail).toHaveBeenCalledWith('user-1');
      expect(
        communityResolverService.getSpaceForCollaborationOrFail
      ).toHaveBeenCalledWith('collab-1', expect.anything());
    });

    it('should fall back to individual query when user not found in map', async () => {
      const user = makeUser('user-1');
      const space = makeSpace('collab-1', 'Space One');

      const spaceMap = new Map<string, ISpace>([
        ['collab-1', space as unknown as ISpace],
      ]);
      // Empty user map — user not pre-loaded
      const userMap = new Map<string, IUser>();

      userService.getUserOrFail.mockResolvedValueOnce(user);

      const rawActivity = makeRawActivity('act-1', 'collab-1', 'user-1');

      await service.convertRawActivityToResult(rawActivity, spaceMap, userMap);

      // User should be loaded individually since not in map
      expect(userService.getUserOrFail).toHaveBeenCalledWith('user-1');
      // Space should come from map
      expect(
        communityResolverService.getSpaceForCollaborationOrFail
      ).not.toHaveBeenCalled();
    });

    it('should fall back to individual query when space not found in map', async () => {
      const user = makeUser('user-1');
      const space = makeSpace('collab-1', 'Space One');

      // Empty space map — space not pre-loaded
      const spaceMap = new Map<string, ISpace>();
      const userMap = new Map<string, IUser>([['user-1', user]]);

      communityResolverService.getSpaceForCollaborationOrFail.mockResolvedValueOnce(
        space as unknown as ISpace
      );

      const rawActivity = makeRawActivity('act-1', 'collab-1', 'user-1');

      await service.convertRawActivityToResult(rawActivity, spaceMap, userMap);

      // Space should be loaded individually since not in map
      expect(
        communityResolverService.getSpaceForCollaborationOrFail
      ).toHaveBeenCalledWith('collab-1', expect.anything());
      // User should come from map
      expect(userService.getUserOrFail).not.toHaveBeenCalled();
    });

    it('should extract parentDisplayName from the pre-loaded space', async () => {
      const user = makeUser('user-1');
      const space = makeSpace('collab-1', 'My Space Name');

      const spaceMap = new Map<string, ISpace>([
        ['collab-1', space as unknown as ISpace],
      ]);
      const userMap = new Map<string, IUser>([['user-1', user]]);

      const rawActivity = makeRawActivity('act-1', 'collab-1', 'user-1');

      const result = await service.convertRawActivityToResult(
        rawActivity,
        spaceMap,
        userMap
      );

      // parentDisplayName should come from space.about.profile.displayName
      expect(result?.parentDisplayName).toBe('My Space Name');
    });
  });

  describe('activityLog', () => {
    it('should fetch activities from activityService and convert them', async () => {
      const rawActivities = [
        makeRawActivity('act-1', 'collab-1', 'user-1'),
        makeRawActivity('act-2', 'collab-1', 'user-2'),
      ];
      activityService.getActivityForCollaborations.mockResolvedValueOnce(
        rawActivities
      );

      const mockResult = { id: 'result-1' } as unknown as IActivityLogEntry;
      const convertSpy = vi
        .spyOn(service, 'convertRawActivityToResult')
        .mockResolvedValue(mockResult);

      const queryData = {
        collaborationID: 'collab-1',
      } as ActivityLogInput;
      const results = await service.activityLog(queryData);

      expect(activityService.getActivityForCollaborations).toHaveBeenCalledWith(
        ['collab-1'],
        { types: undefined }
      );
      expect(convertSpy).toHaveBeenCalledTimes(2);
      expect(results).toHaveLength(2);
    });

    it('should mark child collaboration activities with child: true', async () => {
      const rawActivities = [
        makeRawActivity('act-1', 'collab-1', 'user-1'),
        makeRawActivity('act-2', 'child-collab', 'user-2'),
      ];
      activityService.getActivityForCollaborations.mockResolvedValueOnce(
        rawActivities
      );

      const convertSpy = vi
        .spyOn(service, 'convertRawActivityToResult')
        .mockResolvedValue({ id: 'r' } as unknown as IActivityLogEntry);

      const queryData = {
        collaborationID: 'collab-1',
      } as ActivityLogInput;
      await service.activityLog(queryData, ['child-collab']);

      // Parent collaboration activity — child should remain falsy
      const firstCall = convertSpy.mock.calls[0][0];
      expect(firstCall.child).toBeFalsy();

      // Child collaboration activity — should be marked child: true
      const secondCall = convertSpy.mock.calls[1][0];
      expect(secondCall.child).toBe(true);
    });

    it('should respect limit parameter and stop processing early', async () => {
      const rawActivities = [
        makeRawActivity('act-1', 'collab-1', 'user-1'),
        makeRawActivity('act-2', 'collab-1', 'user-2'),
        makeRawActivity('act-3', 'collab-1', 'user-3'),
      ];
      activityService.getActivityForCollaborations.mockResolvedValueOnce(
        rawActivities
      );

      const mockResult = { id: 'result' } as unknown as IActivityLogEntry;
      const convertSpy = vi
        .spyOn(service, 'convertRawActivityToResult')
        .mockResolvedValue(mockResult);

      const queryData = {
        collaborationID: 'collab-1',
        limit: 2,
      } as ActivityLogInput;
      const results = await service.activityLog(queryData);

      expect(results).toHaveLength(2);
      // Should stop after reaching limit — 3rd activity never processed
      expect(convertSpy).toHaveBeenCalledTimes(2);
    });

    it('should not count undefined results toward limit', async () => {
      const rawActivities = [
        makeRawActivity('act-1', 'collab-1', 'user-1'),
        makeRawActivity('act-2', 'collab-1', 'user-2'),
        makeRawActivity('act-3', 'collab-1', 'user-3'),
      ];
      activityService.getActivityForCollaborations.mockResolvedValueOnce(
        rawActivities
      );

      const mockResult = { id: 'result' } as unknown as IActivityLogEntry;
      const convertSpy = vi.spyOn(service, 'convertRawActivityToResult');
      // First returns undefined, second and third return results
      convertSpy.mockResolvedValueOnce(undefined);
      convertSpy.mockResolvedValueOnce(mockResult);
      convertSpy.mockResolvedValueOnce(mockResult);

      const queryData = {
        collaborationID: 'collab-1',
        limit: 2,
      } as ActivityLogInput;
      const results = await service.activityLog(queryData);

      // All 3 processed since undefined doesn't count toward limit
      expect(convertSpy).toHaveBeenCalledTimes(3);
      expect(results).toHaveLength(2);
    });

    it('should filter out undefined results when no limit is set', async () => {
      const rawActivities = [
        makeRawActivity('act-1', 'collab-1', 'user-1'),
        makeRawActivity('act-2', 'collab-1', 'user-2'),
        makeRawActivity('act-3', 'collab-1', 'user-3'),
      ];
      activityService.getActivityForCollaborations.mockResolvedValueOnce(
        rawActivities
      );

      const mockResult = { id: 'result' } as unknown as IActivityLogEntry;
      const convertSpy = vi.spyOn(service, 'convertRawActivityToResult');
      convertSpy.mockResolvedValueOnce(undefined);
      convertSpy.mockResolvedValueOnce(mockResult);
      convertSpy.mockResolvedValueOnce(mockResult);

      const queryData = {
        collaborationID: 'collab-1',
      } as ActivityLogInput;
      const results = await service.activityLog(queryData);

      expect(convertSpy).toHaveBeenCalledTimes(3);
      expect(results).toHaveLength(2);
    });

    it('should pass types and child collaboration IDs to activityService', async () => {
      activityService.getActivityForCollaborations.mockResolvedValueOnce([]);

      const types = [
        ActivityEventType.CALLOUT_PUBLISHED,
        ActivityEventType.MEMBER_JOINED,
      ];
      const queryData = {
        collaborationID: 'collab-1',
        types,
      } as ActivityLogInput;
      await service.activityLog(queryData, ['child-1', 'child-2']);

      expect(activityService.getActivityForCollaborations).toHaveBeenCalledWith(
        ['collab-1', 'child-1', 'child-2'],
        { types }
      );
    });
  });

  describe('convertRawActivityToResult - error handling', () => {
    it('should return undefined when builder throws', async () => {
      const user = makeUser('user-1');
      const space = makeSpace('collab-1', 'Space One');

      const spaceMap = new Map<string, ISpace>([
        ['collab-1', space as unknown as ISpace],
      ]);
      const userMap = new Map<string, IUser>([['user-1', user]]);

      calloutService.getCalloutOrFail.mockRejectedValueOnce(
        new Error('DB connection lost')
      );

      const rawActivity = makeRawActivity('act-1', 'collab-1', 'user-1');
      const result = await service.convertRawActivityToResult(
        rawActivity,
        spaceMap,
        userMap
      );

      expect(result).toBeUndefined();
    });

    it('should log a warning when an activity fails to convert', async () => {
      const user = makeUser('user-1');
      const space = makeSpace('collab-1', 'Space One');

      const spaceMap = new Map<string, ISpace>([
        ['collab-1', space as unknown as ISpace],
      ]);
      const userMap = new Map<string, IUser>([['user-1', user]]);

      calloutService.getCalloutOrFail.mockRejectedValueOnce(
        new Error('DB connection lost')
      );

      const rawActivity = makeRawActivity('act-1', 'collab-1', 'user-1');
      await service.convertRawActivityToResult(rawActivity, spaceMap, userMap);

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('act-1'),
        expect.any(String)
      );
    });

    it('should isolate errors: one failing activity does not affect others in batch', async () => {
      const user1 = makeUser('user-1');
      const space1 = makeSpace('collab-1', 'Space One');

      const rawActivities = [
        makeRawActivity('act-1', 'collab-1', 'user-1'),
        makeRawActivity('act-2', 'collab-1', 'user-1'),
      ];

      entityManager.find.mockResolvedValueOnce([space1]);
      userLookupService.getUsersByUUID.mockResolvedValueOnce([user1]);

      // First activity fails in builder, second succeeds
      calloutService.getCalloutOrFail
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValueOnce({ id: 'callout-1' } as any);

      const results = await service.convertRawActivityToResults(rawActivities);

      expect(results).toHaveLength(2);
      // First should be undefined (failed)
      expect(results[0]).toBeUndefined();
      // Second should have a result
      expect(results[1]).toBeDefined();
    });
  });

  describe('convertRawActivityToResults - output shape', () => {
    it('should return entries with correct base fields', async () => {
      const user1 = makeUser('user-1');
      const space1 = makeSpace('collab-1', 'Space One');

      const rawActivities = [makeRawActivity('act-1', 'collab-1', 'user-1')];

      entityManager.find.mockResolvedValueOnce([space1]);
      userLookupService.getUsersByUUID.mockResolvedValueOnce([user1]);
      calloutService.getCalloutOrFail.mockResolvedValueOnce({
        id: 'callout-1',
      } as any);

      const results = await service.convertRawActivityToResults(rawActivities);

      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        id: 'act-1',
        collaborationID: 'collab-1',
        type: ActivityEventType.CALLOUT_PUBLISHED,
        parentDisplayName: 'Space One',
        triggeredBy: expect.objectContaining({ id: 'user-1' }),
        space: expect.objectContaining({ id: 'space-for-collab-1' }),
      });
    });

    it('should filter falsy triggeredBy from batch user load', async () => {
      const space1 = makeSpace('collab-1', 'Space One');

      const rawActivities = [makeRawActivity('act-1', 'collab-1', '')];

      entityManager.find.mockResolvedValueOnce([space1]);
      userLookupService.getUsersByUUID.mockResolvedValueOnce([]);

      await service.convertRawActivityToResults(rawActivities);

      // Empty triggeredBy should be filtered from batch user load
      expect(userLookupService.getUsersByUUID).toHaveBeenCalledWith([]);
    });
  });
});
