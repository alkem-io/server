import { ActivityEventType } from '@common/enums/activity.event.type';
import { ActorType } from '@common/enums/actor.type';
import { EntityNotFoundException } from '@common/exceptions/entity.not.found.exception';
import { IActivity } from '@platform/activity';
import { vi } from 'vitest';
import ActivityLogBuilderService from './activity.log.builder.service';
import { IActivityLogEntry } from './dto/activity.log.entry.interface';

// Mock getActorType to avoid lazy require() that fails in vitest
vi.mock('@domain/actor/actor/actor.service', async importOriginal => {
  const original =
    await importOriginal<typeof import('@domain/actor/actor/actor.service')>();
  return {
    ...original,
    getActorType: vi.fn().mockReturnValue(ActorType.USER),
  };
});

describe('ActivityLogBuilderService', () => {
  let builder: ActivityLogBuilderService;
  let actorLookupService: Record<string, any>;
  let calloutService: Record<string, any>;
  let postService: Record<string, any>;
  let whiteboardService: Record<string, any>;
  let memoService: Record<string, any>;
  let spaceService: Record<string, any>;
  let communityService: Record<string, any>;
  let roomService: Record<string, any>;
  let linkService: Record<string, any>;
  let calendarService: Record<string, any>;
  let calendarEventService: Record<string, any>;
  let urlGeneratorService: Record<string, any>;

  const baseEntry: IActivityLogEntry = {
    collaborationID: 'collab-1',
    createdDate: new Date(),
    description: 'test activity',
    triggeredBy: 'user-1',
    type: ActivityEventType.MEMBER_JOINED,
    child: false,
    space: undefined,
    parentDisplayName: 'parent',
  } as any;

  beforeEach(() => {
    actorLookupService = {
      getActorByIdOrFail: vi.fn(),
    };
    calloutService = { getCalloutOrFail: vi.fn() };
    postService = { getPostOrFail: vi.fn() };
    whiteboardService = { getWhiteboardOrFail: vi.fn() };
    memoService = { getMemoOrFail: vi.fn() };
    spaceService = { getSpaceOrFail: vi.fn() };
    communityService = { getCommunityOrFail: vi.fn() };
    roomService = { getRoomOrFail: vi.fn() };
    linkService = { getLinkOrFail: vi.fn() };
    calendarService = { getCalendarOrFail: vi.fn() };
    calendarEventService = { getCalendarEventOrFail: vi.fn() };
    urlGeneratorService = { generateUrlForProfile: vi.fn() };

    builder = new ActivityLogBuilderService(
      baseEntry,
      actorLookupService as any,
      calloutService as any,
      postService as any,
      whiteboardService as any,
      memoService as any,
      spaceService as any,
      communityService as any,
      roomService as any,
      linkService as any,
      calendarService as any,
      calendarEventService as any,
      urlGeneratorService as any
    );
  });

  describe('MEMBER_JOINED', () => {
    it('should throw EntityNotFoundException when parentID is not set', async () => {
      const activity = {
        id: 'act-1',
        type: ActivityEventType.MEMBER_JOINED,
        parentID: undefined,
        resourceID: 'resource-1',
      } as unknown as IActivity;

      await expect(
        builder[ActivityEventType.MEMBER_JOINED](activity)
      ).rejects.toThrow(EntityNotFoundException);
    });

    it('should return member joined entry with community and actor', async () => {
      const community = { id: 'community-1' };
      const joiningActor = { id: 'actor-1', type: ActorType.USER };
      communityService.getCommunityOrFail.mockResolvedValue(community);
      actorLookupService.getActorByIdOrFail.mockResolvedValue(joiningActor);

      const activity = {
        id: 'act-1',
        type: ActivityEventType.MEMBER_JOINED,
        parentID: 'community-1',
        resourceID: 'actor-1',
      } as unknown as IActivity;

      const result = await builder[ActivityEventType.MEMBER_JOINED](activity);

      expect(result.community).toEqual(community);
      expect(result.actor).toEqual(joiningActor);
    });
  });

  describe('CALLOUT_POST_CREATED', () => {
    it('should throw EntityNotFoundException when parentID is not set', async () => {
      const activity = {
        id: 'act-1',
        type: ActivityEventType.CALLOUT_POST_CREATED,
        parentID: undefined,
        resourceID: 'resource-1',
      } as unknown as IActivity;

      await expect(
        builder[ActivityEventType.CALLOUT_POST_CREATED](activity)
      ).rejects.toThrow(EntityNotFoundException);
    });

    it('should return callout and post in the entry', async () => {
      const callout = { id: 'callout-1' };
      const post = { id: 'post-1' };
      calloutService.getCalloutOrFail.mockResolvedValue(callout);
      postService.getPostOrFail.mockResolvedValue(post);

      const activity = {
        id: 'act-1',
        type: ActivityEventType.CALLOUT_POST_CREATED,
        parentID: 'callout-1',
        resourceID: 'post-1',
      } as unknown as IActivity;

      const result =
        await builder[ActivityEventType.CALLOUT_POST_CREATED](activity);

      expect(result.callout).toEqual(callout);
      expect(result.post).toEqual(post);
    });
  });

  describe('CALLOUT_PUBLISHED', () => {
    it('should return callout in the entry without requiring parentID', async () => {
      const callout = { id: 'callout-1' };
      calloutService.getCalloutOrFail.mockResolvedValue(callout);

      const activity = {
        id: 'act-1',
        type: ActivityEventType.CALLOUT_PUBLISHED,
        resourceID: 'callout-1',
      } as unknown as IActivity;

      const result =
        await builder[ActivityEventType.CALLOUT_PUBLISHED](activity);

      expect(result.callout).toEqual(callout);
    });
  });

  describe('CALLOUT_LINK_CREATED', () => {
    it('should throw EntityNotFoundException when parentID is not set', async () => {
      const activity = {
        id: 'act-1',
        type: ActivityEventType.CALLOUT_LINK_CREATED,
        parentID: undefined,
        resourceID: 'link-1',
      } as unknown as IActivity;

      await expect(
        builder[ActivityEventType.CALLOUT_LINK_CREATED](activity)
      ).rejects.toThrow(EntityNotFoundException);
    });

    it('should return callout and link in the entry', async () => {
      const callout = { id: 'callout-1' };
      const link = { id: 'link-1' };
      calloutService.getCalloutOrFail.mockResolvedValue(callout);
      linkService.getLinkOrFail.mockResolvedValue(link);

      const activity = {
        id: 'act-1',
        type: ActivityEventType.CALLOUT_LINK_CREATED,
        parentID: 'callout-1',
        resourceID: 'link-1',
      } as unknown as IActivity;

      const result =
        await builder[ActivityEventType.CALLOUT_LINK_CREATED](activity);

      expect(result.callout).toEqual(callout);
      expect(result.link).toEqual(link);
    });
  });

  describe('CALLOUT_WHITEBOARD_CREATED', () => {
    it('should throw EntityNotFoundException when parentID is not set', async () => {
      const activity = {
        id: 'act-1',
        type: ActivityEventType.CALLOUT_WHITEBOARD_CREATED,
        parentID: undefined,
        resourceID: 'wb-1',
      } as unknown as IActivity;

      await expect(
        builder[ActivityEventType.CALLOUT_WHITEBOARD_CREATED](activity)
      ).rejects.toThrow(EntityNotFoundException);
    });

    it('should return callout and whiteboard in the entry', async () => {
      const callout = { id: 'callout-1' };
      const whiteboard = { id: 'wb-1' };
      calloutService.getCalloutOrFail.mockResolvedValue(callout);
      whiteboardService.getWhiteboardOrFail.mockResolvedValue(whiteboard);

      const activity = {
        id: 'act-1',
        type: ActivityEventType.CALLOUT_WHITEBOARD_CREATED,
        parentID: 'callout-1',
        resourceID: 'wb-1',
      } as unknown as IActivity;

      const result =
        await builder[ActivityEventType.CALLOUT_WHITEBOARD_CREATED](activity);

      expect(result.callout).toEqual(callout);
      expect(result.whiteboard).toEqual(whiteboard);
    });
  });

  describe('CALLOUT_MEMO_CREATED', () => {
    it('should throw EntityNotFoundException when parentID is not set', async () => {
      const activity = {
        id: 'act-1',
        type: ActivityEventType.CALLOUT_MEMO_CREATED,
        parentID: undefined,
        resourceID: 'memo-1',
      } as unknown as IActivity;

      await expect(
        builder[ActivityEventType.CALLOUT_MEMO_CREATED](activity)
      ).rejects.toThrow(EntityNotFoundException);
    });

    it('should return callout and memo in the entry', async () => {
      const callout = { id: 'callout-1' };
      const memo = { id: 'memo-1' };
      calloutService.getCalloutOrFail.mockResolvedValue(callout);
      memoService.getMemoOrFail.mockResolvedValue(memo);

      const activity = {
        id: 'act-1',
        type: ActivityEventType.CALLOUT_MEMO_CREATED,
        parentID: 'callout-1',
        resourceID: 'memo-1',
      } as unknown as IActivity;

      const result =
        await builder[ActivityEventType.CALLOUT_MEMO_CREATED](activity);

      expect(result.callout).toEqual(callout);
      expect(result.memo).toEqual(memo);
    });
  });

  describe('CALLOUT_WHITEBOARD_CONTENT_MODIFIED', () => {
    it('should throw EntityNotFoundException when parentID is not set', async () => {
      const activity = {
        id: 'act-1',
        type: ActivityEventType.CALLOUT_WHITEBOARD_CONTENT_MODIFIED,
        parentID: undefined,
        resourceID: 'wb-1',
      } as unknown as IActivity;

      await expect(
        builder[ActivityEventType.CALLOUT_WHITEBOARD_CONTENT_MODIFIED](activity)
      ).rejects.toThrow(EntityNotFoundException);
    });

    it('should return callout and whiteboard in the entry', async () => {
      const callout = { id: 'callout-1' };
      const whiteboard = { id: 'wb-1' };
      calloutService.getCalloutOrFail.mockResolvedValue(callout);
      whiteboardService.getWhiteboardOrFail.mockResolvedValue(whiteboard);

      const activity = {
        id: 'act-1',
        type: ActivityEventType.CALLOUT_WHITEBOARD_CONTENT_MODIFIED,
        parentID: 'callout-1',
        resourceID: 'wb-1',
      } as unknown as IActivity;

      const result =
        await builder[ActivityEventType.CALLOUT_WHITEBOARD_CONTENT_MODIFIED](
          activity
        );

      expect(result.callout).toEqual(callout);
      expect(result.whiteboard).toEqual(whiteboard);
    });
  });

  describe('CALLOUT_POST_COMMENT', () => {
    it('should throw EntityNotFoundException when parentID is not set', async () => {
      const activity = {
        id: 'act-1',
        type: ActivityEventType.CALLOUT_POST_COMMENT,
        parentID: undefined,
        resourceID: 'post-1',
      } as unknown as IActivity;

      await expect(
        builder[ActivityEventType.CALLOUT_POST_COMMENT](activity)
      ).rejects.toThrow(EntityNotFoundException);
    });

    it('should return callout and post in the entry', async () => {
      const callout = { id: 'callout-1' };
      const post = { id: 'post-1' };
      calloutService.getCalloutOrFail.mockResolvedValue(callout);
      postService.getPostOrFail.mockResolvedValue(post);

      const activity = {
        id: 'act-1',
        type: ActivityEventType.CALLOUT_POST_COMMENT,
        parentID: 'callout-1',
        resourceID: 'post-1',
      } as unknown as IActivity;

      const result =
        await builder[ActivityEventType.CALLOUT_POST_COMMENT](activity);

      expect(result.callout).toEqual(callout);
      expect(result.post).toEqual(post);
    });
  });

  describe('SUBSPACE_CREATED', () => {
    it('should return subspace in the entry', async () => {
      const subspace = { id: 'subspace-1' };
      spaceService.getSpaceOrFail.mockResolvedValue(subspace);

      const activity = {
        id: 'act-1',
        type: ActivityEventType.SUBSPACE_CREATED,
        resourceID: 'subspace-1',
      } as unknown as IActivity;

      const result =
        await builder[ActivityEventType.SUBSPACE_CREATED](activity);

      expect(result.subspace).toEqual(subspace);
    });
  });

  describe('DISCUSSION_COMMENT', () => {
    it('should return callout in the entry', async () => {
      const callout = { id: 'callout-1' };
      calloutService.getCalloutOrFail.mockResolvedValue(callout);

      const activity = {
        id: 'act-1',
        type: ActivityEventType.DISCUSSION_COMMENT,
        resourceID: 'callout-1',
      } as unknown as IActivity;

      const result =
        await builder[ActivityEventType.DISCUSSION_COMMENT](activity);

      expect(result.callout).toEqual(callout);
    });
  });

  describe('UPDATE_SENT', () => {
    it('should throw EntityNotFoundException when space is not set on base entry', async () => {
      const room = { id: 'room-1' };
      roomService.getRoomOrFail.mockResolvedValue(room);

      const activity = {
        id: 'act-1',
        type: ActivityEventType.UPDATE_SENT,
        resourceID: 'room-1',
        collaborationID: 'collab-1',
      } as unknown as IActivity;

      await expect(
        builder[ActivityEventType.UPDATE_SENT](activity)
      ).rejects.toThrow(EntityNotFoundException);
    });

    it('should return update sent entry with room, message, and journey URL', async () => {
      const space = {
        about: { profile: { id: 'profile-1' } },
      };
      const entryWithSpace = { ...baseEntry, space };
      const builderWithSpace = new ActivityLogBuilderService(
        entryWithSpace as any,
        actorLookupService as any,
        calloutService as any,
        postService as any,
        whiteboardService as any,
        memoService as any,
        spaceService as any,
        communityService as any,
        roomService as any,
        linkService as any,
        calendarService as any,
        calendarEventService as any,
        urlGeneratorService as any
      );

      const room = { id: 'room-1' };
      roomService.getRoomOrFail.mockResolvedValue(room);
      urlGeneratorService.generateUrlForProfile.mockResolvedValue(
        'https://example.com/space'
      );

      const activity = {
        id: 'act-1',
        type: ActivityEventType.UPDATE_SENT,
        resourceID: 'room-1',
        collaborationID: 'collab-1',
        description: 'Update message content',
      } as unknown as IActivity;

      const result =
        await builderWithSpace[ActivityEventType.UPDATE_SENT](activity);

      expect(result.updates).toEqual(room);
      expect(result.message).toBe('Update message content');
      expect(result.journeyUrl).toBe('https://example.com/space');
    });

    it('should use empty string for message when description is undefined', async () => {
      const space = {
        about: { profile: { id: 'profile-1' } },
      };
      const entryWithSpace = { ...baseEntry, space };
      const builderWithSpace = new ActivityLogBuilderService(
        entryWithSpace as any,
        actorLookupService as any,
        calloutService as any,
        postService as any,
        whiteboardService as any,
        memoService as any,
        spaceService as any,
        communityService as any,
        roomService as any,
        linkService as any,
        calendarService as any,
        calendarEventService as any,
        urlGeneratorService as any
      );

      roomService.getRoomOrFail.mockResolvedValue({ id: 'room-1' });
      urlGeneratorService.generateUrlForProfile.mockResolvedValue('url');

      const activity = {
        id: 'act-1',
        type: ActivityEventType.UPDATE_SENT,
        resourceID: 'room-1',
        collaborationID: 'collab-1',
        description: undefined,
      } as unknown as IActivity;

      const result =
        await builderWithSpace[ActivityEventType.UPDATE_SENT](activity);

      expect(result.message).toBe('');
    });
  });

  describe('CALENDAR_EVENT_CREATED', () => {
    it('should throw EntityNotFoundException when parentID is not set', async () => {
      const activity = {
        id: 'act-1',
        type: ActivityEventType.CALENDAR_EVENT_CREATED,
        parentID: undefined,
        resourceID: 'event-1',
      } as unknown as IActivity;

      await expect(
        builder[ActivityEventType.CALENDAR_EVENT_CREATED](activity)
      ).rejects.toThrow(EntityNotFoundException);
    });

    it('should return calendar and calendar event in the entry', async () => {
      const calendar = { id: 'cal-1' };
      const calendarEvent = { id: 'event-1' };
      calendarService.getCalendarOrFail.mockResolvedValue(calendar);
      calendarEventService.getCalendarEventOrFail.mockResolvedValue(
        calendarEvent
      );

      const activity = {
        id: 'act-1',
        type: ActivityEventType.CALENDAR_EVENT_CREATED,
        parentID: 'cal-1',
        resourceID: 'event-1',
      } as unknown as IActivity;

      const result =
        await builder[ActivityEventType.CALENDAR_EVENT_CREATED](activity);

      expect(result.calendar).toEqual(calendar);
      expect(result.calendarEvent).toEqual(calendarEvent);
    });
  });
});
