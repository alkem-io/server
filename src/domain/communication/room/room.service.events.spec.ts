import { ActorContext } from '@core/actor-context/actor.context';
import { Test, TestingModule } from '@nestjs/testing';
import { ActivityAdapter } from '@services/adapters/activity-adapter/activity.adapter';
import { NotificationPlatformAdapter } from '@services/adapters/notification-adapter/notification.platform.adapter';
import { NotificationSpaceAdapter } from '@services/adapters/notification-adapter/notification.space.adapter';
import { NotificationUserAdapter } from '@services/adapters/notification-adapter/notification.user.adapter';
import { ContributionReporterService } from '@services/external/elasticsearch/contribution-reporter';
import { CommunityResolverService } from '@services/infrastructure/entity-resolver/community.resolver.service';
import { TimelineResolverService } from '@services/infrastructure/entity-resolver/timeline.resolver.service';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mocked } from 'vitest';
import { IMessage } from '../message/message.interface';
import { IRoom } from './room.interface';
import { RoomServiceEvents } from './room.service.events';

describe('RoomServiceEvents', () => {
  let service: RoomServiceEvents;
  let activityAdapter: Mocked<ActivityAdapter>;
  let contributionReporter: Mocked<ContributionReporterService>;
  let notificationSpaceAdapter: Mocked<NotificationSpaceAdapter>;
  let notificationPlatformAdapter: Mocked<NotificationPlatformAdapter>;
  let notificationUserAdapter: Mocked<NotificationUserAdapter>;
  let communityResolverService: Mocked<CommunityResolverService>;
  let timelineResolverService: Mocked<TimelineResolverService>;

  const mockRoom = { id: 'room-1' } as IRoom;
  const mockMessage = { id: 'msg-1' } as IMessage;
  const actorContextWithID = { actorID: 'user-1' } as ActorContext;
  const actorContextEmpty = { actorID: '' } as ActorContext;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RoomServiceEvents, MockWinstonProvider],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(RoomServiceEvents);
    activityAdapter = module.get(ActivityAdapter);
    contributionReporter = module.get(ContributionReporterService);
    notificationSpaceAdapter = module.get(NotificationSpaceAdapter);
    notificationPlatformAdapter = module.get(NotificationPlatformAdapter);
    notificationUserAdapter = module.get(NotificationUserAdapter);
    communityResolverService = module.get(CommunityResolverService);
    timelineResolverService = module.get(TimelineResolverService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('processNotificationCommentReply', () => {
    it('should send notification when actorID is present', async () => {
      await service.processNotificationCommentReply(
        mockRoom,
        mockMessage,
        actorContextWithID,
        'owner-1'
      );

      expect(notificationUserAdapter.userCommentReply).toHaveBeenCalledWith({
        triggeredBy: 'user-1',
        roomId: 'room-1',
        messageRepliedToOwnerID: 'owner-1',
        messageID: 'msg-1',
      });
    });

    it('should skip notification when actorID is empty', async () => {
      await service.processNotificationCommentReply(
        mockRoom,
        mockMessage,
        actorContextEmpty,
        'owner-1'
      );

      expect(notificationUserAdapter.userCommentReply).not.toHaveBeenCalled();
    });
  });

  describe('processNotificationCalloutComment', () => {
    const mockCallout = { id: 'callout-1' } as any;

    it('should send notification when actorID is present', async () => {
      await service.processNotificationCalloutComment(
        mockCallout,
        mockRoom,
        mockMessage,
        actorContextWithID,
        ['mentioned-1']
      );

      expect(
        notificationSpaceAdapter.spaceCollaborationCalloutComment
      ).toHaveBeenCalledWith({
        triggeredBy: 'user-1',
        callout: mockCallout,
        comments: mockRoom,
        commentSent: mockMessage,
        mentionedUserIDs: ['mentioned-1'],
      });
    });

    it('should skip notification when actorID is empty', async () => {
      await service.processNotificationCalloutComment(
        mockCallout,
        mockRoom,
        mockMessage,
        actorContextEmpty
      );

      expect(
        notificationSpaceAdapter.spaceCollaborationCalloutComment
      ).not.toHaveBeenCalled();
    });
  });

  describe('processNotificationPostContributionComment', () => {
    const mockCallout = { id: 'callout-1' } as any;
    const mockPost = { id: 'post-1' } as any;
    const mockContribution = { id: 'contrib-1' } as any;

    it('should send notification when actorID is present', async () => {
      await service.processNotificationPostContributionComment(
        mockCallout,
        mockPost,
        mockContribution,
        mockRoom,
        mockMessage,
        actorContextWithID,
        ['mentioned-1']
      );

      expect(
        notificationSpaceAdapter.spaceCollaborationCalloutPostContributionComment
      ).toHaveBeenCalledWith({
        triggeredBy: 'user-1',
        post: mockPost,
        callout: mockCallout,
        contribution: mockContribution,
        room: mockRoom,
        commentSent: mockMessage,
        mentionedUserIDs: ['mentioned-1'],
      });
    });

    it('should skip notification when actorID is empty', async () => {
      await service.processNotificationPostContributionComment(
        mockCallout,
        mockPost,
        mockContribution,
        mockRoom,
        mockMessage,
        actorContextEmpty
      );

      expect(
        notificationSpaceAdapter.spaceCollaborationCalloutPostContributionComment
      ).not.toHaveBeenCalled();
    });
  });

  describe('processNotificationForumDiscussionComment', () => {
    const mockDiscussion = {
      id: 'disc-1',
      createdBy: 'user-2',
    } as any;

    it('should send notification when actorID is present', async () => {
      await service.processNotificationForumDiscussionComment(
        mockDiscussion,
        mockMessage,
        actorContextWithID
      );

      expect(
        notificationPlatformAdapter.platformForumDiscussionComment
      ).toHaveBeenCalledWith({
        triggeredBy: 'user-1',
        discussion: mockDiscussion,
        commentSent: mockMessage,
        userID: 'user-2',
      });
    });

    it('should skip notification when actorID is empty', async () => {
      await service.processNotificationForumDiscussionComment(
        mockDiscussion,
        mockMessage,
        actorContextEmpty
      );

      expect(
        notificationPlatformAdapter.platformForumDiscussionComment
      ).not.toHaveBeenCalled();
    });
  });

  describe('processNotificationCalendarEventComment', () => {
    it('should send notification when all conditions are met', async () => {
      const mockCalendarEvent = {
        id: 'event-1',
        calendar: { id: 'cal-1' },
      } as any;
      timelineResolverService.getSpaceIdForCalendar.mockResolvedValue(
        'space-1'
      );

      await service.processNotificationCalendarEventComment(
        mockCalendarEvent,
        mockRoom,
        mockMessage,
        actorContextWithID
      );

      expect(
        notificationSpaceAdapter.spaceCommunityCalendarEventComment
      ).toHaveBeenCalledWith(
        {
          triggeredBy: 'user-1',
          calendarEvent: mockCalendarEvent,
          comments: mockRoom,
          commentSent: mockMessage,
        },
        'space-1'
      );
    });

    it('should skip when calendar event has no calendar', async () => {
      const mockCalendarEvent = {
        id: 'event-1',
        calendar: undefined,
      } as any;

      await service.processNotificationCalendarEventComment(
        mockCalendarEvent,
        mockRoom,
        mockMessage,
        actorContextWithID
      );

      expect(
        notificationSpaceAdapter.spaceCommunityCalendarEventComment
      ).not.toHaveBeenCalled();
    });

    it('should skip when space ID cannot be determined', async () => {
      const mockCalendarEvent = {
        id: 'event-1',
        calendar: { id: 'cal-1' },
      } as any;
      timelineResolverService.getSpaceIdForCalendar.mockResolvedValue(
        undefined as any
      );

      await service.processNotificationCalendarEventComment(
        mockCalendarEvent,
        mockRoom,
        mockMessage,
        actorContextWithID
      );

      expect(
        notificationSpaceAdapter.spaceCommunityCalendarEventComment
      ).not.toHaveBeenCalled();
    });

    it('should skip when actorID is empty', async () => {
      const mockCalendarEvent = {
        id: 'event-1',
        calendar: { id: 'cal-1' },
      } as any;
      timelineResolverService.getSpaceIdForCalendar.mockResolvedValue(
        'space-1'
      );

      await service.processNotificationCalendarEventComment(
        mockCalendarEvent,
        mockRoom,
        mockMessage,
        actorContextEmpty
      );

      expect(
        notificationSpaceAdapter.spaceCommunityCalendarEventComment
      ).not.toHaveBeenCalled();
    });
  });

  describe('processActivityPostComment', () => {
    const mockPost = {
      id: 'post-1',
      profile: { displayName: 'Test Post' },
    } as any;

    it('should create activity and report contribution when actorID is present', async () => {
      communityResolverService.getCommunityFromPostRoomOrFail.mockResolvedValue(
        { id: 'community-1' } as any
      );
      communityResolverService.getLevelZeroSpaceIdForCommunity.mockResolvedValue(
        'space-1'
      );

      await service.processActivityPostComment(
        mockPost,
        mockRoom,
        mockMessage,
        actorContextWithID
      );

      expect(activityAdapter.calloutPostComment).toHaveBeenCalledWith({
        triggeredBy: 'user-1',
        post: mockPost,
        message: mockMessage,
      });
      expect(
        contributionReporter.calloutPostCommentCreated
      ).toHaveBeenCalledWith(
        { id: 'post-1', name: 'Test Post', space: 'space-1' },
        actorContextWithID
      );
    });

    it('should skip activity and contribution when actorID is empty', async () => {
      communityResolverService.getCommunityFromPostRoomOrFail.mockResolvedValue(
        { id: 'community-1' } as any
      );
      communityResolverService.getLevelZeroSpaceIdForCommunity.mockResolvedValue(
        'space-1'
      );

      await service.processActivityPostComment(
        mockPost,
        mockRoom,
        mockMessage,
        actorContextEmpty
      );

      expect(activityAdapter.calloutPostComment).not.toHaveBeenCalled();
      expect(
        contributionReporter.calloutPostCommentCreated
      ).not.toHaveBeenCalled();
    });
  });

  describe('processActivityMessageRemoved', () => {
    it('should create activity when actorID is present', async () => {
      await service.processActivityMessageRemoved('msg-1', actorContextWithID);

      expect(activityAdapter.messageRemoved).toHaveBeenCalledWith({
        triggeredBy: 'user-1',
        messageID: 'msg-1',
      });
    });

    it('should skip activity when actorID is empty', async () => {
      await service.processActivityMessageRemoved('msg-1', actorContextEmpty);

      expect(activityAdapter.messageRemoved).not.toHaveBeenCalled();
    });
  });

  describe('processActivityUpdateSent', () => {
    it('should create activity and report contribution when actorID is present', async () => {
      communityResolverService.getCommunityFromUpdatesOrFail.mockResolvedValue({
        id: 'community-1',
      } as any);
      communityResolverService.getLevelZeroSpaceIdForCommunity.mockResolvedValue(
        'space-1'
      );

      await service.processActivityUpdateSent(
        mockRoom,
        mockMessage,
        actorContextWithID
      );

      expect(activityAdapter.updateSent).toHaveBeenCalledWith({
        triggeredBy: 'user-1',
        updates: mockRoom,
        message: mockMessage,
      });
      expect(contributionReporter.updateCreated).toHaveBeenCalledWith(
        { id: 'room-1', name: '', space: 'space-1' },
        actorContextWithID
      );
    });

    it('should skip activity and contribution when actorID is empty', async () => {
      communityResolverService.getCommunityFromUpdatesOrFail.mockResolvedValue({
        id: 'community-1',
      } as any);
      communityResolverService.getLevelZeroSpaceIdForCommunity.mockResolvedValue(
        'space-1'
      );

      await service.processActivityUpdateSent(
        mockRoom,
        mockMessage,
        actorContextEmpty
      );

      expect(activityAdapter.updateSent).not.toHaveBeenCalled();
      expect(contributionReporter.updateCreated).not.toHaveBeenCalled();
    });
  });

  describe('processNotificationUpdateSent', () => {
    it('should send notification when actorID is present', async () => {
      await service.processNotificationUpdateSent(
        mockRoom,
        mockMessage,
        actorContextWithID
      );

      expect(
        notificationSpaceAdapter.spaceCommunicationUpdate
      ).toHaveBeenCalledWith({
        triggeredBy: 'user-1',
        updates: mockRoom,
        lastMessage: mockMessage,
      });
    });

    it('should skip notification when actorID is empty', async () => {
      await service.processNotificationUpdateSent(
        mockRoom,
        mockMessage,
        actorContextEmpty
      );

      expect(
        notificationSpaceAdapter.spaceCommunicationUpdate
      ).not.toHaveBeenCalled();
    });
  });

  describe('processActivityCalloutCommentCreated', () => {
    const mockCallout = { id: 'callout-1', nameID: 'test-callout' } as any;

    it('should create activity and report contribution when actorID is present', async () => {
      communityResolverService.getCommunityFromCollaborationCalloutOrFail.mockResolvedValue(
        { id: 'community-1' } as any
      );
      communityResolverService.getLevelZeroSpaceIdForCommunity.mockResolvedValue(
        'space-1'
      );

      await service.processActivityCalloutCommentCreated(
        mockCallout,
        mockMessage,
        actorContextWithID
      );

      expect(activityAdapter.calloutCommentCreated).toHaveBeenCalledWith({
        triggeredBy: 'user-1',
        callout: mockCallout,
        message: mockMessage,
      });
      expect(contributionReporter.calloutCommentCreated).toHaveBeenCalledWith(
        { id: 'callout-1', name: 'test-callout', space: 'space-1' },
        actorContextWithID
      );
    });

    it('should skip activity and contribution when actorID is empty', async () => {
      communityResolverService.getCommunityFromCollaborationCalloutOrFail.mockResolvedValue(
        { id: 'community-1' } as any
      );
      communityResolverService.getLevelZeroSpaceIdForCommunity.mockResolvedValue(
        'space-1'
      );

      await service.processActivityCalloutCommentCreated(
        mockCallout,
        mockMessage,
        actorContextEmpty
      );

      expect(activityAdapter.calloutCommentCreated).not.toHaveBeenCalled();
      expect(contributionReporter.calloutCommentCreated).not.toHaveBeenCalled();
    });
  });
});
