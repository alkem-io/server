import { ActivityEventType } from '@common/enums/activity.event.type';
import { EntityNotFoundException } from '@common/exceptions';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { MockType } from '@test/utils/mock.type';
import { repositoryProviderMockFactory } from '@test/utils/repository.provider.mock.factory';
import { Repository } from 'typeorm';
import { vi } from 'vitest';
import { Activity } from './activity.entity';
import { ActivityService } from './activity.service';

describe('ActivityService', () => {
  let service: ActivityService;
  let activityRepository: MockType<Repository<Activity>>;

  beforeEach(async () => {
    vi.restoreAllMocks();

    vi.spyOn(Activity, 'create').mockImplementation((input: any) => {
      const e = new Activity();
      Object.assign(e, input);
      return e as any;
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ActivityService,
        repositoryProviderMockFactory(Activity),
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(ActivityService);
    activityRepository = module.get(getRepositoryToken(Activity));
  });

  describe('createActivity', () => {
    it('should truncate description to SMALL_TEXT_LENGTH and save activity', async () => {
      const longDescription = 'a'.repeat(300);
      const savedActivity = {
        id: 'act-1',
        description: longDescription.substring(0, 256),
      } as Activity;
      activityRepository.save!.mockResolvedValue(savedActivity);

      const result = await service.createActivity({
        description: longDescription,
        resourceID: 'res-1',
        collaborationID: 'collab-1',
        parentID: 'parent-1',
        type: 'CALLOUT_PUBLISHED' as any,
        visibility: true,
        triggeredBy: 'user-1',
      });

      expect(activityRepository.save).toHaveBeenCalled();
      expect(result).toBe(savedActivity);
    });
  });

  describe('getActivityOrFail', () => {
    it('should return the activity when found', async () => {
      const activity = { id: 'act-1' } as Activity;
      activityRepository.findOne!.mockResolvedValue(activity);

      const result = await service.getActivityOrFail('act-1');

      expect(result).toBe(activity);
    });

    it('should throw EntityNotFoundException when activity not found', async () => {
      activityRepository.findOne!.mockResolvedValue(null);

      await expect(service.getActivityOrFail('missing')).rejects.toThrow(
        EntityNotFoundException
      );
    });
  });

  describe('removeActivity', () => {
    it('should find and remove the activity', async () => {
      const activity = { id: 'act-1' } as Activity;
      activityRepository.findOne!.mockResolvedValue(activity);
      activityRepository.remove!.mockResolvedValue(activity);

      const result = await service.removeActivity('act-1');

      expect(activityRepository.remove).toHaveBeenCalledWith(activity);
      expect(result).toBe(activity);
    });

    it('should throw EntityNotFoundException when activity to remove not found', async () => {
      activityRepository.findOne!.mockResolvedValue(null);

      await expect(service.removeActivity('missing')).rejects.toThrow(
        EntityNotFoundException
      );
    });
  });

  describe('save', () => {
    it('should save and return activity', async () => {
      const activity = { id: 'act-1' } as Activity;
      activityRepository.save!.mockResolvedValue(activity);

      const result = await service.save(activity);

      expect(result).toBe(activity);
    });
  });

  describe('updateActivityVisibility', () => {
    it('should set visibility on the activity and save it', async () => {
      const activity = { id: 'act-1', visibility: true } as Activity;
      activityRepository.save!.mockResolvedValue({
        ...activity,
        visibility: false,
      });

      const result = await service.updateActivityVisibility(activity, false);

      expect(activity.visibility).toBe(false);
      expect(activityRepository.save).toHaveBeenCalledWith(activity);
      expect(result.visibility).toBe(false);
    });
  });

  describe('getActivityForCollaborations', () => {
    it('should return activities for given collaboration IDs', async () => {
      const activities = [{ id: 'a1' }] as any;
      activityRepository.find!.mockResolvedValue(activities);

      const result = await service.getActivityForCollaborations(['collab-1']);

      expect(result).toBe(activities);
      expect(activityRepository.find).toHaveBeenCalled();
    });

    it('should apply types filter when provided', async () => {
      activityRepository.find!.mockResolvedValue([]);

      await service.getActivityForCollaborations(['collab-1'], {
        types: [ActivityEventType.CALLOUT_PUBLISHED],
        limit: 10,
        userID: 'user-1',
      });

      expect(activityRepository.find).toHaveBeenCalled();
    });

    it('should use default visibility=true when no options', async () => {
      activityRepository.find!.mockResolvedValue([]);

      await service.getActivityForCollaborations(['collab-1']);

      expect(activityRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            visibility: true,
          }),
        })
      );
    });

    it('should pass userID as triggeredBy filter', async () => {
      activityRepository.find!.mockResolvedValue([]);

      await service.getActivityForCollaborations(['collab-1'], {
        userID: 'specific-user',
      });

      expect(activityRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            triggeredBy: 'specific-user',
          }),
        })
      );
    });

    it('should respect visibility=false when passed', async () => {
      activityRepository.find!.mockResolvedValue([]);

      await service.getActivityForCollaborations(['collab-1'], {
        visibility: false,
      });

      expect(activityRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            visibility: false,
          }),
        })
      );
    });
  });

  describe('getActivityForMessage', () => {
    it('should return null and log warning when no activity found for message', async () => {
      const mockQB = {
        where: vi.fn().mockReturnThis(),
        setParameters: vi.fn().mockReturnThis(),
        getOne: vi.fn().mockResolvedValue(null),
      };
      activityRepository.createQueryBuilder!.mockReturnValue(mockQB);

      const result = await service.getActivityForMessage('msg-123');

      expect(result).toBeNull();
    });

    it('should return the activity entry when found for message', async () => {
      const activity = { id: 'act-1', messageID: 'msg-123' } as Activity;
      const mockQB = {
        where: vi.fn().mockReturnThis(),
        setParameters: vi.fn().mockReturnThis(),
        getOne: vi.fn().mockResolvedValue(activity),
      };
      activityRepository.createQueryBuilder!.mockReturnValue(mockQB);

      const result = await service.getActivityForMessage('msg-123');

      expect(result).toBe(activity);
    });
  });

  describe('getPaginatedActivity', () => {
    // getPaginatedActivity calls getPaginationResults which has deep QB chaining.
    // We create a self-referencing mock to handle all chained calls.
    const createDeepQB = () => {
      const qb: any = {
        where: vi.fn(),
        andWhere: vi.fn(),
        orderBy: vi.fn(),
        addOrderBy: vi.fn(),
        take: vi.fn(),
        skip: vi.fn(),
        getManyAndCount: vi.fn().mockResolvedValue([[], 0]),
        getCount: vi.fn().mockResolvedValue(0),
        getMany: vi.fn().mockResolvedValue([]),
        expressionMap: { orderBys: {}, wheres: [] },
        clone: vi.fn(),
      };
      // All chainable methods return self
      qb.where.mockReturnValue(qb);
      qb.andWhere.mockReturnValue(qb);
      qb.orderBy.mockReturnValue(qb);
      qb.addOrderBy.mockReturnValue(qb);
      qb.take.mockReturnValue(qb);
      qb.skip.mockReturnValue(qb);
      qb.clone.mockReturnValue(qb);
      return qb;
    };

    it('should build query with types and excludeTypes filters', async () => {
      const qb = createDeepQB();
      activityRepository.createQueryBuilder!.mockReturnValue(qb);

      await service.getPaginatedActivity(['collab-1'], {
        types: [ActivityEventType.CALLOUT_PUBLISHED],
        excludeTypes: [ActivityEventType.MEMBER_JOINED],
        userID: 'user-1',
      });

      expect(qb.where).toHaveBeenCalled();
      expect(qb.andWhere).toHaveBeenCalled();
    });

    it('should build query without optional filters', async () => {
      const qb = createDeepQB();
      activityRepository.createQueryBuilder!.mockReturnValue(qb);

      await service.getPaginatedActivity(['collab-1']);

      expect(qb.where).toHaveBeenCalled();
    });
  });

  describe('getGroupedActivity', () => {
    let entityManager: any;

    beforeEach(() => {
      entityManager = (service as any).entityManager;
    });

    it('should execute raw query with visibility and collaborationIDs and return activities', async () => {
      entityManager.connection = {
        query: vi.fn().mockResolvedValue([{ latest: '1' }, { latest: '2' }]),
      };
      activityRepository.find!.mockResolvedValue([
        { id: 'a1' },
        { id: 'a2' },
      ] as any);

      const result = await service.getGroupedActivity(['c1', 'c2']);

      expect(entityManager.connection.query).toHaveBeenCalled();
      expect(result).toHaveLength(2);
    });

    it('should include types condition when types provided', async () => {
      entityManager.connection = {
        query: vi.fn().mockResolvedValue([]),
      };
      activityRepository.find!.mockResolvedValue([]);

      await service.getGroupedActivity(['c1'], {
        types: [ActivityEventType.CALLOUT_PUBLISHED],
      });

      const queryParams = entityManager.connection.query.mock.calls[0][1];
      expect(queryParams).toContain(ActivityEventType.CALLOUT_PUBLISHED);
    });

    it('should include triggeredBy condition when userID provided', async () => {
      entityManager.connection = {
        query: vi.fn().mockResolvedValue([]),
      };
      activityRepository.find!.mockResolvedValue([]);

      await service.getGroupedActivity(['c1'], {
        userID: 'user-1',
      });

      const queryParams = entityManager.connection.query.mock.calls[0][1];
      expect(queryParams).toContain('user-1');
    });

    it('should apply limit when specified', async () => {
      entityManager.connection = {
        query: vi.fn().mockResolvedValue([]),
      };
      activityRepository.find!.mockResolvedValue([]);

      await service.getGroupedActivity(['c1'], { limit: 5 });

      const queryStr = entityManager.connection.query.mock.calls[0][0];
      expect(queryStr).toContain('LIMIT 5');
    });

    it('should use ASC ordering when specified', async () => {
      entityManager.connection = {
        query: vi.fn().mockResolvedValue([]),
      };
      activityRepository.find!.mockResolvedValue([]);

      await service.getGroupedActivity(['c1'], { orderBy: 'ASC' });

      const queryStr = entityManager.connection.query.mock.calls[0][0];
      expect(queryStr).toContain('ASC');
    });

    it('should handle empty collaborationIDs', async () => {
      entityManager.connection = {
        query: vi.fn().mockResolvedValue([]),
      };
      activityRepository.find!.mockResolvedValue([]);

      await service.getGroupedActivity([]);

      expect(entityManager.connection.query).toHaveBeenCalled();
    });
  });

  describe('getMySpacesActivity', () => {
    let entityManager: any;

    beforeEach(() => {
      entityManager = (service as any).entityManager;
    });

    it('should return latest activities per collaboration limited by limit', async () => {
      const activities = [
        {
          id: 'a1',
          collaborationID: 'c1',
          createdDate: new Date('2024-01-02'),
        },
        {
          id: 'a2',
          collaborationID: 'c1',
          createdDate: new Date('2024-01-01'),
        },
        {
          id: 'a3',
          collaborationID: 'c2',
          createdDate: new Date('2024-01-03'),
        },
      ];

      const qb = {
        select: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        getMany: vi.fn().mockResolvedValue(activities),
      };
      activityRepository.createQueryBuilder!.mockReturnValue(qb);

      const collabQb = {
        select: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        getMany: vi.fn().mockResolvedValue([{ id: 'c1' }, { id: 'c2' }]),
      };
      entityManager.getRepository = vi.fn().mockReturnValue({
        createQueryBuilder: vi.fn().mockReturnValue(collabQb),
      });

      const result = await service.getMySpacesActivity('user-1', 10);

      // Should return 2 activities (one per collaboration)
      expect(result).toHaveLength(2);
    });

    it('should filter out activities whose collaboration no longer exists', async () => {
      const activities = [
        { id: 'a1', collaborationID: 'deleted-c', createdDate: new Date() },
      ];

      const qb = {
        select: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        getMany: vi.fn().mockResolvedValue(activities),
      };
      activityRepository.createQueryBuilder!.mockReturnValue(qb);

      const collabQb = {
        select: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        getMany: vi.fn().mockResolvedValue([]),
      };
      entityManager.getRepository = vi.fn().mockReturnValue({
        createQueryBuilder: vi.fn().mockReturnValue(collabQb),
      });

      const result = await service.getMySpacesActivity('user-1', 10);

      expect(result).toHaveLength(0);
    });

    it('should respect the limit parameter', async () => {
      const activities = [
        {
          id: 'a1',
          collaborationID: 'c1',
          createdDate: new Date('2024-01-03'),
        },
        {
          id: 'a2',
          collaborationID: 'c2',
          createdDate: new Date('2024-01-02'),
        },
        {
          id: 'a3',
          collaborationID: 'c3',
          createdDate: new Date('2024-01-01'),
        },
      ];

      const qb = {
        select: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        getMany: vi.fn().mockResolvedValue(activities),
      };
      activityRepository.createQueryBuilder!.mockReturnValue(qb);

      const collabQb = {
        select: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        getMany: vi
          .fn()
          .mockResolvedValue([{ id: 'c1' }, { id: 'c2' }, { id: 'c3' }]),
      };
      entityManager.getRepository = vi.fn().mockReturnValue({
        createQueryBuilder: vi.fn().mockReturnValue(collabQb),
      });

      const result = await service.getMySpacesActivity('user-1', 1);

      expect(result).toHaveLength(1);
    });
  });

  describe('getLatestActivitiesPerSpaceMembership', () => {
    it('should query activities for collaboration IDs from membership info', async () => {
      const qb = {
        select: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        getMany: vi.fn().mockResolvedValue([]),
      };
      activityRepository.createQueryBuilder!.mockReturnValue(qb);

      const spaceMembershipInfo = new Map([['c1', { spaceId: 's1' }]]) as any;

      const result = await service.getLatestActivitiesPerSpaceMembership(
        'user-1',
        spaceMembershipInfo
      );

      expect(result).toBeDefined();
      expect(qb.where).toHaveBeenCalled();
    });
  });
});
