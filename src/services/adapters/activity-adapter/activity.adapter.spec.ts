import { ActivityEventType } from '@common/enums/activity.event.type';
import { EntityNotFoundException } from '@common/exceptions';
import { Callout } from '@domain/collaboration/callout/callout.entity';
import { Memo } from '@domain/common/memo/memo.entity';
import { Whiteboard } from '@domain/common/whiteboard/whiteboard.entity';
import { Community } from '@domain/community/community/community.entity';
import { Test, TestingModule } from '@nestjs/testing';
import { getEntityManagerToken, getRepositoryToken } from '@nestjs/typeorm';
import { TimelineResolverService } from '@services/infrastructure/entity-resolver/timeline.resolver.service';
import { SubscriptionPublishService } from '@services/subscriptions/subscription-service';
import { ActivityService } from '@src/platform/activity/activity.service';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { vi } from 'vitest';
import { ActivityAdapter } from './activity.adapter';

describe('ActivityAdapter', () => {
  let adapter: ActivityAdapter;
  let activityService: ActivityService;
  let subscriptionPublishService: SubscriptionPublishService;
  let timelineResolverService: TimelineResolverService;
  let mockEntityManager: {
    findOne: ReturnType<typeof vi.fn>;
    createQueryBuilder: ReturnType<typeof vi.fn>;
  };
  let mockCalloutQb: Record<string, ReturnType<typeof vi.fn>>;
  let mockWhiteboardQb: Record<string, ReturnType<typeof vi.fn>>;
  let mockMemoQb: Record<string, ReturnType<typeof vi.fn>>;
  let mockCommunityQb: Record<string, ReturnType<typeof vi.fn>>;
  let mockQueryBuilder: Record<string, ReturnType<typeof vi.fn>>;

  const createQueryBuilderMock = () => {
    const qb: Record<string, ReturnType<typeof vi.fn>> = {
      leftJoinAndSelect: vi.fn().mockReturnThis(),
      innerJoinAndSelect: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orWhere: vi.fn().mockReturnThis(),
      setParameters: vi.fn().mockReturnThis(),
      getOne: vi.fn(),
    };
    // Make chainable methods return the qb itself
    for (const key of Object.keys(qb)) {
      if (key !== 'getOne') {
        qb[key].mockReturnValue(qb);
      }
    }
    return qb;
  };

  beforeEach(async () => {
    vi.restoreAllMocks();

    mockQueryBuilder = createQueryBuilderMock();

    mockEntityManager = {
      findOne: vi.fn(),
      createQueryBuilder: vi.fn().mockReturnValue(mockQueryBuilder),
    };

    mockCalloutQb = createQueryBuilderMock();
    mockWhiteboardQb = createQueryBuilderMock();
    mockMemoQb = createQueryBuilderMock();
    mockCommunityQb = createQueryBuilderMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ActivityAdapter,
        {
          provide: WINSTON_MODULE_NEST_PROVIDER,
          useValue: {
            error: vi.fn(),
            warn: vi.fn(),
            verbose: vi.fn(),
          },
        },
        {
          provide: getEntityManagerToken('default'),
          useValue: mockEntityManager,
        },
        {
          provide: getRepositoryToken(Community),
          useValue: {
            createQueryBuilder: vi.fn().mockReturnValue(mockCommunityQb),
          },
        },
        {
          provide: getRepositoryToken(Callout),
          useValue: {
            createQueryBuilder: vi.fn().mockReturnValue(mockCalloutQb),
          },
        },
        {
          provide: getRepositoryToken(Whiteboard),
          useValue: {
            createQueryBuilder: vi.fn().mockReturnValue(mockWhiteboardQb),
          },
        },
        {
          provide: getRepositoryToken(Memo),
          useValue: { createQueryBuilder: vi.fn().mockReturnValue(mockMemoQb) },
        },
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    adapter = module.get<ActivityAdapter>(ActivityAdapter);
    activityService = module.get<ActivityService>(ActivityService);
    subscriptionPublishService = module.get<SubscriptionPublishService>(
      SubscriptionPublishService
    );
    timelineResolverService = module.get<TimelineResolverService>(
      TimelineResolverService
    );
  });

  it('should be defined', () => {
    expect(adapter).toBeDefined();
  });

  describe('subspaceCreated', () => {
    it('should create activity and publish subscription', async () => {
      const mockActivity = { id: 'activity-1' };
      mockEntityManager.findOne.mockResolvedValue({
        id: 'subspace-1',
        about: { profile: { displayName: 'Sub Space' } },
        parentSpace: {
          id: 'parent-1',
          collaboration: { id: 'collab-1' },
        },
      });
      vi.mocked(activityService.createActivity).mockResolvedValue(
        mockActivity as any
      );

      const result = await adapter.subspaceCreated({
        triggeredBy: 'user-1',
        subspace: { id: 'subspace-1' },
      } as any);

      expect(result).toBe(true);
      expect(activityService.createActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          collaborationID: 'collab-1',
          triggeredBy: 'user-1',
          resourceID: 'subspace-1',
          type: ActivityEventType.SUBSPACE_CREATED,
        })
      );
      expect(subscriptionPublishService.publishActivity).toHaveBeenCalledWith(
        'collab-1',
        mockActivity
      );
    });

    it('should throw EntityNotFoundException when subspace not found', async () => {
      mockEntityManager.findOne.mockResolvedValue(null);

      await expect(
        adapter.subspaceCreated({
          triggeredBy: 'user-1',
          subspace: { id: 'subspace-1' },
        } as any)
      ).rejects.toThrow(EntityNotFoundException);
    });

    it('should throw when subspace has no parent collaboration', async () => {
      mockEntityManager.findOne.mockResolvedValue({
        id: 'subspace-1',
        about: { profile: { displayName: 'Sub' } },
        parentSpace: null,
      });

      await expect(
        adapter.subspaceCreated({
          triggeredBy: 'user-1',
          subspace: { id: 'subspace-1' },
        } as any)
      ).rejects.toThrow(EntityNotFoundException);
    });
  });

  describe('calloutPublished', () => {
    it('should create activity for callout published', async () => {
      const mockActivity = { id: 'activity-1' };
      // Mock getCollaborationIdForCallout
      mockEntityManager.findOne.mockResolvedValue({ id: 'collab-1' });
      vi.mocked(activityService.createActivity).mockResolvedValue(
        mockActivity as any
      );

      const result = await adapter.calloutPublished({
        triggeredBy: 'user-1',
        callout: {
          id: 'callout-1',
          framing: {
            profile: {
              displayName: 'Callout Name',
              description: 'Callout Description',
            },
          },
        },
      } as any);

      expect(result).toBe(true);
      expect(activityService.createActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          type: ActivityEventType.CALLOUT_PUBLISHED,
        })
      );
    });

    it('should throw when collaboration not found', async () => {
      mockEntityManager.findOne.mockResolvedValue(null);

      await expect(
        adapter.calloutPublished({
          triggeredBy: 'user-1',
          callout: {
            id: 'callout-1',
            framing: {
              profile: { displayName: 'Test', description: 'desc' },
            },
          },
        } as any)
      ).rejects.toThrow(EntityNotFoundException);
    });
  });

  describe('calloutPostCreated', () => {
    it('should return false when post was deleted (EntityNotFoundException)', async () => {
      // Mock getCollaborationIdForPost to throw EntityNotFoundException
      mockEntityManager.findOne.mockResolvedValue(null);

      const result = await adapter.calloutPostCreated({
        triggeredBy: 'user-1',
        callout: { id: 'callout-1' },
        post: {
          id: 'post-1',
          profile: { displayName: 'Post', description: 'desc' },
        },
      } as any);

      expect(result).toBe(false);
    });

    it('should rethrow non-EntityNotFoundException errors', async () => {
      mockEntityManager.findOne.mockRejectedValue(new Error('Database error'));

      await expect(
        adapter.calloutPostCreated({
          triggeredBy: 'user-1',
          callout: { id: 'callout-1' },
          post: {
            id: 'post-1',
            profile: { displayName: 'Post', description: 'desc' },
          },
        } as any)
      ).rejects.toThrow('Database error');
    });
  });

  describe('messageRemoved', () => {
    it('should update activity visibility when activity found', async () => {
      const mockActivity = { id: 'activity-1' };
      vi.mocked(activityService.getActivityForMessage).mockResolvedValue(
        mockActivity as any
      );

      const result = await adapter.messageRemoved({
        messageID: 'msg-1',
      } as any);

      expect(result).toBe(true);
      expect(activityService.updateActivityVisibility).toHaveBeenCalledWith(
        mockActivity,
        false
      );
    });

    it('should return true even when activity not found', async () => {
      vi.mocked(activityService.getActivityForMessage).mockResolvedValue(
        null as any
      );

      const result = await adapter.messageRemoved({
        messageID: 'msg-1',
      } as any);

      expect(result).toBe(true);
      expect(activityService.updateActivityVisibility).not.toHaveBeenCalled();
    });
  });

  describe('calloutPostCreated (success)', () => {
    it('should create activity when post exists', async () => {
      const mockActivity = { id: 'activity-1' };
      mockEntityManager.findOne.mockResolvedValue({ id: 'collab-1' });
      vi.mocked(activityService.createActivity).mockResolvedValue(
        mockActivity as any
      );

      const result = await adapter.calloutPostCreated({
        triggeredBy: 'user-1',
        callout: { id: 'callout-1' },
        post: {
          id: 'post-1',
          profile: { displayName: 'Post', description: 'desc' },
        },
      } as any);

      expect(result).toBe(true);
      expect(activityService.createActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          type: ActivityEventType.CALLOUT_POST_CREATED,
          resourceID: 'post-1',
        })
      );
    });
  });

  describe('calloutLinkCreated', () => {
    it('should create activity for link created', async () => {
      const mockActivity = { id: 'activity-1' };
      mockEntityManager.findOne.mockResolvedValue({ id: 'collab-1' });
      vi.mocked(activityService.createActivity).mockResolvedValue(
        mockActivity as any
      );

      const result = await adapter.calloutLinkCreated({
        triggeredBy: 'user-1',
        callout: {
          id: 'callout-1',
          framing: { profile: { displayName: 'Callout' } },
        },
        link: {
          id: 'link-1',
          profile: { displayName: 'Link Name' },
        },
      } as any);

      expect(result).toBe(true);
      expect(activityService.createActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          type: ActivityEventType.CALLOUT_LINK_CREATED,
          resourceID: 'link-1',
        })
      );
    });
  });

  describe('calendarEventCreated', () => {
    it('should create activity for calendar event', async () => {
      const mockActivity = { id: 'activity-1' };
      vi.mocked(
        timelineResolverService.getCollaborationIdForCalendar
      ).mockResolvedValue('collab-1');
      vi.mocked(activityService.createActivity).mockResolvedValue(
        mockActivity as any
      );

      const result = await adapter.calendarEventCreated({
        triggeredBy: 'user-1',
        calendarEvent: {
          id: 'event-1',
          profile: { displayName: 'Event', description: 'desc' },
        },
        calendar: { id: 'calendar-1' },
      } as any);

      expect(result).toBe(true);
      expect(activityService.createActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          type: ActivityEventType.CALENDAR_EVENT_CREATED,
          resourceID: 'event-1',
        })
      );
    });
  });

  describe('calloutPostComment', () => {
    it('should create activity for post comment', async () => {
      const mockActivity = { id: 'activity-1' };
      // getCalloutIdForPost uses calloutRepository query builder
      mockCalloutQb.getOne.mockResolvedValue({ id: 'callout-1' });
      // getCollaborationIdForCallout uses entityManager.findOne
      mockEntityManager.findOne.mockResolvedValue({ id: 'collab-1' });
      vi.mocked(activityService.createActivity).mockResolvedValue(
        mockActivity as any
      );

      const result = await adapter.calloutPostComment({
        triggeredBy: 'user-1',
        post: { id: 'post-1' },
        message: { id: 'msg-1', message: 'A comment' },
      } as any);

      expect(result).toBe(true);
      expect(activityService.createActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          type: ActivityEventType.CALLOUT_POST_COMMENT,
        })
      );
    });
  });

  describe('calloutWhiteboardCreated', () => {
    it('should create activity for whiteboard created', async () => {
      const mockActivity = { id: 'activity-1' };
      // getCollaborationIdForWhiteboard uses entityManager.findOne
      mockEntityManager.findOne.mockResolvedValue({ id: 'collab-1' });
      vi.mocked(activityService.createActivity).mockResolvedValue(
        mockActivity as any
      );

      const result = await adapter.calloutWhiteboardCreated({
        triggeredBy: 'user-1',
        callout: { id: 'callout-1' },
        whiteboard: {
          id: 'wb-1',
          profile: { displayName: 'Whiteboard' },
        },
      } as any);

      expect(result).toBe(true);
      expect(activityService.createActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          type: ActivityEventType.CALLOUT_WHITEBOARD_CREATED,
          resourceID: 'wb-1',
        })
      );
    });
  });

  describe('calloutMemoCreated', () => {
    it('should create activity for memo created', async () => {
      const mockActivity = { id: 'activity-1' };
      // getCollaborationIdForMemo uses entityManager.findOne
      mockEntityManager.findOne.mockResolvedValue({ id: 'collab-1' });
      // getMemoDisplayName uses memoRepository query builder
      mockMemoQb.getOne.mockResolvedValue({
        profile: { displayName: 'Memo Title' },
      });
      vi.mocked(activityService.createActivity).mockResolvedValue(
        mockActivity as any
      );

      const result = await adapter.calloutMemoCreated({
        triggeredBy: 'user-1',
        callout: { id: 'callout-1' },
        memo: { id: 'memo-1' },
      } as any);

      expect(result).toBe(true);
      expect(activityService.createActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          type: ActivityEventType.CALLOUT_MEMO_CREATED,
          resourceID: 'memo-1',
        })
      );
    });
  });

  describe('calloutWhiteboardContentModified', () => {
    it('should create activity for whiteboard content modified', async () => {
      const mockActivity = { id: 'activity-1' };
      // getWhiteboardDisplayName uses whiteboardRepository query builder
      mockWhiteboardQb.getOne.mockResolvedValue({
        profile: { displayName: 'WB Name' },
      });
      // getCollaborationIdWithCalloutIdForWhiteboard uses entityManager.createQueryBuilder then findOne
      mockQueryBuilder.getOne.mockResolvedValue({ id: 'callout-1' });
      mockEntityManager.findOne.mockResolvedValue({ id: 'collab-1' });
      vi.mocked(activityService.createActivity).mockResolvedValue(
        mockActivity as any
      );

      const result = await adapter.calloutWhiteboardContentModified({
        triggeredBy: 'user-1',
        whiteboardId: 'wb-1',
      } as any);

      expect(result).toBe(true);
      expect(activityService.createActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          type: ActivityEventType.CALLOUT_WHITEBOARD_CONTENT_MODIFIED,
        })
      );
    });
  });

  describe('calloutCommentCreated', () => {
    it('should create activity for callout comment', async () => {
      const mockActivity = { id: 'activity-1' };
      mockEntityManager.findOne.mockResolvedValue({ id: 'collab-1' });
      vi.mocked(activityService.createActivity).mockResolvedValue(
        mockActivity as any
      );

      const result = await adapter.calloutCommentCreated({
        triggeredBy: 'user-1',
        callout: { id: 'callout-1' },
        message: { id: 'msg-1', message: 'Discussion comment' },
      } as any);

      expect(result).toBe(true);
      expect(activityService.createActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          type: ActivityEventType.DISCUSSION_COMMENT,
        })
      );
    });
  });

  describe('updateSent', () => {
    it('should create activity for update sent', async () => {
      const mockActivity = { id: 'activity-1' };
      // getCommunityIdFromUpdates uses communityRepository query builder
      mockCommunityQb.getOne.mockResolvedValue({ id: 'community-1' });
      // getCollaborationIdFromCommunity uses entityManager.findOne
      mockEntityManager.findOne.mockResolvedValue({
        collaboration: { id: 'collab-1' },
      });
      vi.mocked(activityService.createActivity).mockResolvedValue(
        mockActivity as any
      );

      const result = await adapter.updateSent({
        triggeredBy: 'user-1',
        updates: { id: 'updates-1' },
        message: { id: 'msg-1', message: 'Update message' },
      } as any);

      expect(result).toBe(true);
      expect(activityService.createActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          type: ActivityEventType.UPDATE_SENT,
        })
      );
    });
  });

  describe('memberJoined', () => {
    it('should create activity for member joined', async () => {
      const mockActivity = { id: 'activity-1' };
      mockEntityManager.findOne.mockResolvedValue({
        collaboration: { id: 'collab-1' },
      });
      vi.mocked(activityService.createActivity).mockResolvedValue(
        mockActivity as any
      );

      const result = await adapter.memberJoined({
        triggeredBy: 'user-1',
        community: { id: 'community-1' },
        contributor: { id: 'contributor-1' },
      } as any);

      expect(result).toBe(true);
      expect(activityService.createActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          type: ActivityEventType.MEMBER_JOINED,
          resourceID: 'contributor-1',
          parentID: 'community-1',
        })
      );
    });
  });
});
