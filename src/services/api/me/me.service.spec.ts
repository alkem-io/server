import { AuthorizationCredential } from '@common/enums';
import { ActorContext } from '@core/actor-context/actor.context';
import { ISpace } from '@domain/space/space/space.interface';
import { Test, TestingModule } from '@nestjs/testing';
import { IActivity } from '@platform/activity/activity.interface';
import { ActivityService } from '@platform/activity/activity.service';
import { MockWinstonProvider } from '@test/mocks';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { type Mocked, vi } from 'vitest';
import { ActivityLogService } from '../activity-log';
import { IActivityLogEntry } from '../activity-log/dto/activity.log.entry.interface';
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
  let logger: any;

  beforeEach(async () => {
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
    logger = module.get(WINSTON_MODULE_NEST_PROVIDER);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
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
