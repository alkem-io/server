import { AuthorizationCredential } from '@common/enums';
import { SpaceLevel } from '@common/enums/space.level';
import { ActorContext } from '@core/actor-context/actor.context';
import { ISpace } from '@domain/space/space/space.interface';
import { SpaceService } from '@domain/space/space/space.service';
import { Test, TestingModule } from '@nestjs/testing';
import { IActivity } from '@platform/activity/activity.interface';
import { ActivityService } from '@platform/activity/activity.service';
import { CommunityResolverService } from '@services/infrastructure/entity-resolver/community.resolver.service';
import { MockWinstonProvider } from '@test/mocks';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { type Mock, type Mocked, vi } from 'vitest';
import { ActivityLogService } from '../activity-log';
import { IActivityLogEntry } from '../activity-log/dto/activity.log.entry.interface';
import { RolesService } from '../roles/roles.service';
import { MeService } from './me.service';

function makeActorContext(
  userId: string,
  memberSpaceIds: string[]
): ActorContext {
  const actorContext = new ActorContext();
  actorContext.actorID = userId;
  actorContext.credentials = memberSpaceIds.map(spaceId => ({
    type: AuthorizationCredential.SPACE_MEMBER,
    resourceID: spaceId,
  }));
  return actorContext;
}

function makeRawActivity(
  id: string,
  collaborationID: string,
  triggeredBy: string
): IActivity {
  return {
    id,
    collaborationID,
    triggeredBy,
    resourceID: `resource-${id}`,
    type: 'calloutPublished',
    createdDate: new Date('2024-01-01'),
    visibility: true,
    child: false,
  } as unknown as IActivity;
}

function makeActivityLogEntry(
  id: string,
  spaceId: string | undefined
): IActivityLogEntry | undefined {
  if (!spaceId) return undefined;
  return {
    id,
    space: { id: spaceId } as unknown as ISpace,
    collaborationID: `collab-${id}`,
    type: 'calloutPublished',
    createdDate: new Date('2024-01-01'),
  } as unknown as IActivityLogEntry;
}

describe('MeService', () => {
  let service: MeService;
  let activityService: Mocked<ActivityService>;
  let activityLogService: Mocked<ActivityLogService>;
  let rolesService: {
    getCommunityInvitationsForUser: Mock;
    getCommunityApplicationsForUser: Mock;
  };
  let spaceService: { getSpacesInList: Mock };
  let communityResolverService: { getSpaceForRoleSetOrFail: Mock };
  let logger: any;

  beforeEach(async () => {
    vi.restoreAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [MeService, MockWinstonProvider],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get<MeService>(MeService);
    activityService = module.get<ActivityService>(
      ActivityService
    ) as Mocked<ActivityService>;
    activityLogService = module.get<ActivityLogService>(
      ActivityLogService
    ) as Mocked<ActivityLogService>;
    rolesService = module.get(RolesService) as any;
    spaceService = module.get(SpaceService) as any;
    communityResolverService = module.get(CommunityResolverService) as any;
    logger = module.get(WINSTON_MODULE_NEST_PROVIDER);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getCommunityInvitationsCountForUser', () => {
    it('should return the count of invitations', async () => {
      rolesService.getCommunityInvitationsForUser.mockResolvedValue([
        { id: 'inv-1' },
        { id: 'inv-2' },
      ]);

      const result =
        await service.getCommunityInvitationsCountForUser('user-1');
      expect(result).toBe(2);
    });

    it('should pass states filter through', async () => {
      rolesService.getCommunityInvitationsForUser.mockResolvedValue([]);
      const result = await service.getCommunityInvitationsCountForUser(
        'user-1',
        ['pending']
      );
      expect(result).toBe(0);
      expect(rolesService.getCommunityInvitationsForUser).toHaveBeenCalledWith(
        'user-1',
        ['pending']
      );
    });

    it('should return zero when no invitations exist', async () => {
      rolesService.getCommunityInvitationsForUser.mockResolvedValue([]);
      const result =
        await service.getCommunityInvitationsCountForUser('user-1');
      expect(result).toBe(0);
    });
  });

  describe('getCommunityInvitationsForUser', () => {
    it('should return invitation results with space info', async () => {
      const invitation = { id: 'inv-1', roleSet: { id: 'rs-1' } };
      rolesService.getCommunityInvitationsForUser.mockResolvedValue([
        invitation,
      ]);
      communityResolverService.getSpaceForRoleSetOrFail.mockResolvedValue({
        id: 'space-1',
        level: SpaceLevel.L0,
        about: { guidelines: { id: 'gl-1' } },
      });

      const results = await service.getCommunityInvitationsForUser('user-1');

      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('inv-1');
      expect(results[0].invitation).toBe(invitation);
      expect(results[0].spacePendingMembershipInfo.id).toBe('space-1');
      expect(results[0].spacePendingMembershipInfo.level).toBe(SpaceLevel.L0);
    });

    it('should throw when invitation has no roleSet', async () => {
      rolesService.getCommunityInvitationsForUser.mockResolvedValue([
        { id: 'inv-1', roleSet: undefined },
      ]);

      await expect(
        service.getCommunityInvitationsForUser('user-1')
      ).rejects.toThrow();
    });

    it('should throw when space has no about', async () => {
      rolesService.getCommunityInvitationsForUser.mockResolvedValue([
        { id: 'inv-1', roleSet: { id: 'rs-1' } },
      ]);
      communityResolverService.getSpaceForRoleSetOrFail.mockResolvedValue({
        id: 'space-1',
        about: undefined,
      });

      await expect(
        service.getCommunityInvitationsForUser('user-1')
      ).rejects.toThrow();
    });

    it('should return empty array when no invitations', async () => {
      rolesService.getCommunityInvitationsForUser.mockResolvedValue([]);
      const results = await service.getCommunityInvitationsForUser('user-1');
      expect(results).toHaveLength(0);
    });
  });

  describe('getCommunityApplicationsForUser', () => {
    it('should return application results with space info', async () => {
      const application = { id: 'app-1', roleSet: { id: 'rs-1' } };
      rolesService.getCommunityApplicationsForUser.mockResolvedValue([
        application,
      ]);
      communityResolverService.getSpaceForRoleSetOrFail.mockResolvedValue({
        id: 'space-1',
        level: SpaceLevel.L1,
        about: { guidelines: { id: 'gl-1' } },
      });

      const results = await service.getCommunityApplicationsForUser('user-1');

      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('app-1');
      expect(results[0].application).toBe(application);
      expect(results[0].spacePendingMembershipInfo.id).toBe('space-1');
    });

    it('should throw when application has no roleSet', async () => {
      rolesService.getCommunityApplicationsForUser.mockResolvedValue([
        { id: 'app-1', roleSet: undefined },
      ]);

      await expect(
        service.getCommunityApplicationsForUser('user-1')
      ).rejects.toThrow();
    });

    it('should throw when space has no about', async () => {
      rolesService.getCommunityApplicationsForUser.mockResolvedValue([
        { id: 'app-1', roleSet: { id: 'rs-1' } },
      ]);
      communityResolverService.getSpaceForRoleSetOrFail.mockResolvedValue({
        id: 'space-1',
        about: undefined,
      });

      await expect(
        service.getCommunityApplicationsForUser('user-1')
      ).rejects.toThrow();
    });
  });

  describe('getSpaceMembershipsFlat', () => {
    it('should return flat memberships for valid spaces', async () => {
      const actorContext = makeActorContext('actor-1', ['space-1']);

      spaceService.getSpacesInList.mockResolvedValue([
        {
          id: 'space-1',
          level: SpaceLevel.L0,
          collaboration: { id: 'collab-1' },
          levelZeroSpaceID: 'space-1',
        },
      ]);
      activityService.getLatestActivitiesPerSpaceMembership.mockResolvedValue(
        new Map()
      );

      const result = await service.getSpaceMembershipsFlat(actorContext);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('space-1');
      expect(result[0].childMemberships).toEqual([]);
    });

    it('should filter out orphaned L1 spaces without parents', async () => {
      const actorContext = makeActorContext('actor-1', [
        'space-ok',
        'space-orphan',
      ]);

      spaceService.getSpacesInList.mockResolvedValue([
        {
          id: 'space-ok',
          level: SpaceLevel.L0,
          collaboration: { id: 'c1' },
          levelZeroSpaceID: 'space-ok',
        },
        {
          id: 'space-orphan',
          level: SpaceLevel.L1,
          parentSpace: undefined,
          collaboration: { id: 'c2' },
          levelZeroSpaceID: 'space-ok',
        },
      ]);
      activityService.getLatestActivitiesPerSpaceMembership.mockResolvedValue(
        new Map()
      );

      const result = await service.getSpaceMembershipsFlat(actorContext);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('space-ok');
    });

    it('should filter out spaces without collaboration', async () => {
      const actorContext = makeActorContext('actor-1', ['space-1']);

      spaceService.getSpacesInList.mockResolvedValue([
        {
          id: 'space-1',
          level: SpaceLevel.L0,
          collaboration: undefined,
          levelZeroSpaceID: 'space-1',
        },
      ]);
      activityService.getLatestActivitiesPerSpaceMembership.mockResolvedValue(
        new Map()
      );

      const result = await service.getSpaceMembershipsFlat(actorContext);

      expect(result).toHaveLength(0);
    });
  });

  describe('getSpaceMembershipsHierarchical', () => {
    it('should build hierarchical memberships with L0, L1, L2', async () => {
      const actorContext = makeActorContext('actor-1', [
        'l0-space',
        'l1-space',
        'l2-space',
      ]);

      const l0 = {
        id: 'l0-space',
        level: SpaceLevel.L0,
        collaboration: { id: 'c0' },
        levelZeroSpaceID: 'l0-space',
      };
      const l1 = {
        id: 'l1-space',
        level: SpaceLevel.L1,
        parentSpace: { id: 'l0-space' },
        collaboration: { id: 'c1' },
        levelZeroSpaceID: 'l0-space',
      };
      const l2 = {
        id: 'l2-space',
        level: SpaceLevel.L2,
        parentSpace: { id: 'l1-space' },
        collaboration: { id: 'c2' },
        levelZeroSpaceID: 'l0-space',
      };

      spaceService.getSpacesInList.mockResolvedValue([l0, l1, l2]);
      activityService.getLatestActivitiesPerSpaceMembership.mockResolvedValue(
        new Map()
      );

      const result =
        await service.getSpaceMembershipsHierarchical(actorContext);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('l0-space');
      expect(result[0].childMemberships).toHaveLength(1);
      expect(result[0].childMemberships[0].id).toBe('l1-space');
      expect(result[0].childMemberships[0].childMemberships).toHaveLength(1);
      expect(result[0].childMemberships[0].childMemberships[0].id).toBe(
        'l2-space'
      );
    });

    it('should respect limit on L0 spaces', async () => {
      const actorContext = makeActorContext('actor-1', [
        'space-1',
        'space-2',
        'space-3',
      ]);

      spaceService.getSpacesInList.mockResolvedValue([
        {
          id: 'space-1',
          level: SpaceLevel.L0,
          collaboration: { id: 'c1' },
          levelZeroSpaceID: 'space-1',
        },
        {
          id: 'space-2',
          level: SpaceLevel.L0,
          collaboration: { id: 'c2' },
          levelZeroSpaceID: 'space-2',
        },
        {
          id: 'space-3',
          level: SpaceLevel.L0,
          collaboration: { id: 'c3' },
          levelZeroSpaceID: 'space-3',
        },
      ]);
      activityService.getLatestActivitiesPerSpaceMembership.mockResolvedValue(
        new Map()
      );

      const result = await service.getSpaceMembershipsHierarchical(
        actorContext,
        2
      );

      expect(result).toHaveLength(2);
    });

    it('should not nest L1 under wrong L0 parent', async () => {
      const actorContext = makeActorContext('actor-1', [
        'l0-a',
        'l0-b',
        'l1-b',
      ]);

      spaceService.getSpacesInList.mockResolvedValue([
        {
          id: 'l0-a',
          level: SpaceLevel.L0,
          collaboration: { id: 'ca' },
          levelZeroSpaceID: 'l0-a',
        },
        {
          id: 'l0-b',
          level: SpaceLevel.L0,
          collaboration: { id: 'cb' },
          levelZeroSpaceID: 'l0-b',
        },
        {
          id: 'l1-b',
          level: SpaceLevel.L1,
          parentSpace: { id: 'l0-b' },
          collaboration: { id: 'c1b' },
          levelZeroSpaceID: 'l0-b',
        },
      ]);
      activityService.getLatestActivitiesPerSpaceMembership.mockResolvedValue(
        new Map()
      );

      const result =
        await service.getSpaceMembershipsHierarchical(actorContext);

      expect(result).toHaveLength(2);
      const l0a = result.find(r => r.id === 'l0-a')!;
      const l0b = result.find(r => r.id === 'l0-b')!;
      expect(l0a.childMemberships).toHaveLength(0);
      expect(l0b.childMemberships).toHaveLength(1);
      expect(l0b.childMemberships[0].id).toBe('l1-b');
    });
  });

  describe('getMySpaces', () => {
    it('should call convertRawActivityToResults (batch) instead of individual conversions', async () => {
      const rawActivities = [
        makeRawActivity('act-1', 'collab-1', 'user-1'),
        makeRawActivity('act-2', 'collab-2', 'user-1'),
      ];

      activityService.getMySpacesActivity.mockResolvedValueOnce(rawActivities);
      activityLogService.convertRawActivityToResults.mockResolvedValueOnce([
        makeActivityLogEntry('act-1', 'space-1'),
        makeActivityLogEntry('act-2', 'space-2'),
      ]);

      const actorContext = makeActorContext('user-1', ['space-1', 'space-2']);
      await service.getMySpaces(actorContext, 20);

      // Should use batch method
      expect(
        activityLogService.convertRawActivityToResults
      ).toHaveBeenCalledTimes(1);
      expect(
        activityLogService.convertRawActivityToResults
      ).toHaveBeenCalledWith(rawActivities);
    });

    it('should return spaces matching user membership credentials', async () => {
      const rawActivities = [
        makeRawActivity('act-1', 'collab-1', 'user-1'),
        makeRawActivity('act-2', 'collab-2', 'user-1'),
      ];

      activityService.getMySpacesActivity.mockResolvedValueOnce(rawActivities);
      activityLogService.convertRawActivityToResults.mockResolvedValueOnce([
        makeActivityLogEntry('act-1', 'space-1'),
        makeActivityLogEntry('act-2', 'space-2'),
      ]);

      const actorContext = makeActorContext('user-1', ['space-1', 'space-2']);
      const results = await service.getMySpaces(actorContext, 20);

      expect(results).toHaveLength(2);
      expect(results[0].space.id).toBe('space-1');
      expect(results[1].space.id).toBe('space-2');
    });

    it('should filter out spaces where user has no membership', async () => {
      const rawActivities = [
        makeRawActivity('act-1', 'collab-1', 'user-1'),
        makeRawActivity('act-2', 'collab-2', 'user-1'),
        makeRawActivity('act-3', 'collab-3', 'user-1'),
      ];

      activityService.getMySpacesActivity.mockResolvedValueOnce(rawActivities);
      activityLogService.convertRawActivityToResults.mockResolvedValueOnce([
        makeActivityLogEntry('act-1', 'space-1'),
        makeActivityLogEntry('act-2', 'space-no-membership'),
        makeActivityLogEntry('act-3', 'space-3'),
      ]);

      // User only has membership in space-1 and space-3
      const actorContext = makeActorContext('user-1', ['space-1', 'space-3']);
      const results = await service.getMySpaces(actorContext, 20);

      expect(results).toHaveLength(2);
      expect(results[0].space.id).toBe('space-1');
      expect(results[1].space.id).toBe('space-3');
    });

    it('should skip activities with no space and log a warning', async () => {
      const rawActivities = [
        makeRawActivity('act-1', 'collab-1', 'user-1'),
        makeRawActivity('act-orphan', 'collab-2', 'user-1'),
        makeRawActivity('act-3', 'collab-3', 'user-1'),
      ];

      activityService.getMySpacesActivity.mockResolvedValueOnce(rawActivities);
      activityLogService.convertRawActivityToResults.mockResolvedValueOnce([
        makeActivityLogEntry('act-1', 'space-1'),
        undefined, // orphaned activity — no space
        makeActivityLogEntry('act-3', 'space-3'),
      ]);

      const actorContext = makeActorContext('user-1', ['space-1', 'space-3']);
      const results = await service.getMySpaces(actorContext, 20);

      expect(results).toHaveLength(2);
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('act-orphan'),
        expect.any(String)
      );
    });

    it('should respect the limit parameter', async () => {
      const rawActivities = Array.from({ length: 10 }, (_, i) =>
        makeRawActivity(`act-${i}`, `collab-${i}`, 'user-1')
      );

      activityService.getMySpacesActivity.mockResolvedValueOnce(rawActivities);
      activityLogService.convertRawActivityToResults.mockResolvedValueOnce(
        rawActivities.map((_, i) =>
          makeActivityLogEntry(`act-${i}`, `space-${i}`)
        )
      );

      const spaceIds = rawActivities.map((_, i) => `space-${i}`);
      const actorContext = makeActorContext('user-1', spaceIds);
      const results = await service.getMySpaces(actorContext, 3);

      expect(results).toHaveLength(3);
    });

    it('should return empty array when no activities exist', async () => {
      activityService.getMySpacesActivity.mockResolvedValueOnce([]);
      activityLogService.convertRawActivityToResults.mockResolvedValueOnce([]);

      const actorContext = makeActorContext('user-1', ['space-1']);
      const results = await service.getMySpaces(actorContext, 20);

      expect(results).toHaveLength(0);
    });

    it('should request limit×2 raw activities from activityService', async () => {
      activityService.getMySpacesActivity.mockResolvedValueOnce([]);
      activityLogService.convertRawActivityToResults.mockResolvedValueOnce([]);

      const actorContext = makeActorContext('user-1', ['space-1']);
      await service.getMySpaces(actorContext, 15);

      expect(activityService.getMySpacesActivity).toHaveBeenCalledWith(
        'user-1',
        30 // limit × 2
      );
    });

    it('should include latestActivity in results', async () => {
      const rawActivities = [makeRawActivity('act-1', 'collab-1', 'user-1')];
      const activityLogEntry = makeActivityLogEntry('act-1', 'space-1')!;

      activityService.getMySpacesActivity.mockResolvedValueOnce(rawActivities);
      activityLogService.convertRawActivityToResults.mockResolvedValueOnce([
        activityLogEntry,
      ]);

      const actorContext = makeActorContext('user-1', ['space-1']);
      const results = await service.getMySpaces(actorContext, 20);

      expect(results).toHaveLength(1);
      expect(results[0].latestActivity).toBe(activityLogEntry);
      expect(results[0].space).toBe(activityLogEntry.space);
    });

    describe('edge cases', () => {
      it('should return empty array when user has no space membership credentials', async () => {
        const rawActivities = [
          makeRawActivity('act-1', 'collab-1', 'user-1'),
          makeRawActivity('act-2', 'collab-2', 'user-1'),
        ];

        activityService.getMySpacesActivity.mockResolvedValueOnce(
          rawActivities
        );
        activityLogService.convertRawActivityToResults.mockResolvedValueOnce([
          makeActivityLogEntry('act-1', 'space-1'),
          makeActivityLogEntry('act-2', 'space-2'),
        ]);

        const actorContext = makeActorContext('user-1', []);
        const results = await service.getMySpaces(actorContext, 20);

        expect(results).toHaveLength(0);
        expect(
          activityLogService.convertRawActivityToResults
        ).toHaveBeenCalledTimes(1);
      });

      it('should return duplicate space entries when same space appears in multiple activities', async () => {
        const rawActivities = [
          makeRawActivity('act-1', 'collab-1', 'user-1'),
          makeRawActivity('act-2', 'collab-2', 'user-1'),
          makeRawActivity('act-3', 'collab-3', 'user-1'),
        ];

        activityService.getMySpacesActivity.mockResolvedValueOnce(
          rawActivities
        );
        activityLogService.convertRawActivityToResults.mockResolvedValueOnce([
          makeActivityLogEntry('act-1', 'space-1'),
          makeActivityLogEntry('act-2', 'space-1'),
          makeActivityLogEntry('act-3', 'space-2'),
        ]);

        const actorContext = makeActorContext('user-1', ['space-1', 'space-2']);
        const results = await service.getMySpaces(actorContext, 20);

        expect(results).toHaveLength(3);
        expect(results[0].space.id).toBe('space-1');
        expect(results[1].space.id).toBe('space-1');
        expect(results[2].space.id).toBe('space-2');
      });

      it('should skip activities with null space property and log warning', async () => {
        const rawActivities = [
          makeRawActivity('act-1', 'collab-1', 'user-1'),
          makeRawActivity('act-null-space', 'collab-2', 'user-1'),
          makeRawActivity('act-3', 'collab-3', 'user-1'),
        ];

        activityService.getMySpacesActivity.mockResolvedValueOnce(
          rawActivities
        );
        activityLogService.convertRawActivityToResults.mockResolvedValueOnce([
          makeActivityLogEntry('act-1', 'space-1'),
          {
            id: 'act-null-space',
            space: null,
            collaborationID: 'collab-2',
            type: 'calloutPublished',
            createdDate: new Date('2024-01-01'),
          } as unknown as IActivityLogEntry,
          makeActivityLogEntry('act-3', 'space-3'),
        ]);

        const actorContext = makeActorContext('user-1', ['space-1', 'space-3']);
        const results = await service.getMySpaces(actorContext, 20);

        expect(results).toHaveLength(2);
        expect(logger.warn).toHaveBeenCalledWith(
          expect.stringContaining('act-null-space'),
          expect.any(String)
        );
      });

      it('should return fewer results than limit when filtering removes entries', async () => {
        const rawActivities = Array.from({ length: 10 }, (_, i) =>
          makeRawActivity(`act-${i}`, `collab-${i}`, 'user-1')
        );

        activityService.getMySpacesActivity.mockResolvedValueOnce(
          rawActivities
        );
        activityLogService.convertRawActivityToResults.mockResolvedValueOnce(
          rawActivities.map((_, i) =>
            makeActivityLogEntry(`act-${i}`, `space-${i}`)
          )
        );

        // User only has membership in 4 of the 10 spaces
        const actorContext = makeActorContext('user-1', [
          'space-0',
          'space-3',
          'space-5',
          'space-9',
        ]);
        const results = await service.getMySpaces(actorContext, 10);

        expect(results).toHaveLength(4);
      });

      it('should use default limit of 20 when not specified', async () => {
        activityService.getMySpacesActivity.mockResolvedValueOnce([]);
        activityLogService.convertRawActivityToResults.mockResolvedValueOnce(
          []
        );

        const actorContext = makeActorContext('user-1', ['space-1']);
        await service.getMySpaces(actorContext);

        expect(activityService.getMySpacesActivity).toHaveBeenCalledWith(
          'user-1',
          40 // default limit 20 × 2
        );
      });

      it('should return empty array and log warnings when all conversions fail', async () => {
        const rawActivities = [
          makeRawActivity('act-1', 'collab-1', 'user-1'),
          makeRawActivity('act-2', 'collab-2', 'user-1'),
          makeRawActivity('act-3', 'collab-3', 'user-1'),
        ];

        activityService.getMySpacesActivity.mockResolvedValueOnce(
          rawActivities
        );
        activityLogService.convertRawActivityToResults.mockResolvedValueOnce([
          undefined,
          undefined,
          undefined,
        ]);

        const actorContext = makeActorContext('user-1', ['space-1']);
        const results = await service.getMySpaces(actorContext, 20);

        expect(results).toHaveLength(0);
        expect(logger.warn).toHaveBeenCalledTimes(3);
        expect(logger.warn).toHaveBeenCalledWith(
          expect.stringContaining('act-1'),
          expect.any(String)
        );
        expect(logger.warn).toHaveBeenCalledWith(
          expect.stringContaining('act-2'),
          expect.any(String)
        );
        expect(logger.warn).toHaveBeenCalledWith(
          expect.stringContaining('act-3'),
          expect.any(String)
        );
      });
    });
  });
});
