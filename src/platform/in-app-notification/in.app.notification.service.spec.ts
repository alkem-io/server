import { ActorType } from '@common/enums/actor.type';
import { NotificationEvent } from '@common/enums/notification.event';
import { NotificationEventInAppState } from '@common/enums/notification.event.in.app.state';
import { EntityNotFoundException } from '@common/exceptions';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { MockType } from '@test/utils/mock.type';
import { repositoryProviderMockFactory } from '@test/utils/repository.provider.mock.factory';
import { Repository } from 'typeorm';
import { InAppNotification } from './in.app.notification.entity';
import { InAppNotificationService } from './in.app.notification.service';

describe('InAppNotificationService', () => {
  let service: InAppNotificationService;
  let notificationRepo: MockType<Repository<InAppNotification>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InAppNotificationService,
        repositoryProviderMockFactory(InAppNotification),
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(InAppNotificationService);
    notificationRepo = module.get(getRepositoryToken(InAppNotification));
  });

  describe('createInAppNotification', () => {
    it('should extract spaceID for PLATFORM_ADMIN_SPACE_CREATED event', () => {
      const payload = { spaceID: 'space-1' };
      notificationRepo.create!.mockImplementation((input: any) => input);

      const result = service.createInAppNotification({
        type: NotificationEvent.PLATFORM_ADMIN_SPACE_CREATED,
        category: 'admin' as any,
        triggeredByID: 'user-1',
        triggeredAt: new Date(),
        receiverID: 'user-2',
        payload: payload as any,
      });

      expect(result.spaceID).toBe('space-1');
      expect(result.state).toBe(NotificationEventInAppState.UNREAD);
    });

    it('should extract roomID for PLATFORM_FORUM_DISCUSSION_CREATED event', () => {
      const payload = { discussion: { roomID: 'room-1' } };
      notificationRepo.create!.mockImplementation((input: any) => input);

      const result = service.createInAppNotification({
        type: NotificationEvent.PLATFORM_FORUM_DISCUSSION_CREATED,
        category: 'platform' as any,
        triggeredByID: 'user-1',
        triggeredAt: new Date(),
        receiverID: 'user-2',
        payload: payload as any,
      });

      expect(result.roomID).toBe('room-1');
    });

    it('should extract messageID and roomID for PLATFORM_FORUM_DISCUSSION_COMMENT event', () => {
      const payload = {
        discussion: { roomID: 'room-1' },
        comment: { id: 'msg-1' },
      };
      notificationRepo.create!.mockImplementation((input: any) => input);

      const result = service.createInAppNotification({
        type: NotificationEvent.PLATFORM_FORUM_DISCUSSION_COMMENT,
        category: 'platform' as any,
        triggeredByID: 'user-1',
        triggeredAt: new Date(),
        receiverID: 'user-2',
        payload: payload as any,
      });

      expect(result.messageID).toBe('msg-1');
      expect(result.roomID).toBe('room-1');
    });

    it('should extract contributorActorId for SPACE_ADMIN_COMMUNITY_NEW_MEMBER', () => {
      const payload = {
        spaceID: 'space-1',
        actorType: ActorType.USER,
        actorID: 'user-contributor',
      };
      notificationRepo.create!.mockImplementation((input: any) => input);

      const result = service.createInAppNotification({
        type: NotificationEvent.SPACE_ADMIN_COMMUNITY_NEW_MEMBER,
        category: 'admin' as any,
        triggeredByID: 'user-1',
        triggeredAt: new Date(),
        receiverID: 'user-2',
        payload: payload as any,
      });

      expect(result.contributorActorId).toBe('user-contributor');
      expect(result.spaceID).toBe('space-1');
    });

    it('should extract userID for PLATFORM_ADMIN_USER_PROFILE_CREATED event', () => {
      const payload = { userID: 'user-new' };
      notificationRepo.create!.mockImplementation((input: any) => input);

      const result = service.createInAppNotification({
        type: NotificationEvent.PLATFORM_ADMIN_USER_PROFILE_CREATED,
        category: 'admin' as any,
        triggeredByID: 'user-1',
        triggeredAt: new Date(),
        receiverID: 'user-2',
        payload: payload as any,
      });

      expect(result.userID).toBe('user-new');
    });

    it('should extract no FKs for PLATFORM_ADMIN_USER_PROFILE_REMOVED event', () => {
      notificationRepo.create!.mockImplementation((input: any) => input);

      const result = service.createInAppNotification({
        type: NotificationEvent.PLATFORM_ADMIN_USER_PROFILE_REMOVED,
        category: 'admin' as any,
        triggeredByID: 'user-1',
        triggeredAt: new Date(),
        receiverID: 'user-2',
        payload: {} as any,
      });

      expect(result.spaceID).toBeUndefined();
      expect(result.userID).toBeUndefined();
    });

    it('should extract no FKs for PLATFORM_ADMIN_GLOBAL_ROLE_CHANGED event', () => {
      notificationRepo.create!.mockImplementation((input: any) => input);

      const result = service.createInAppNotification({
        type: NotificationEvent.PLATFORM_ADMIN_GLOBAL_ROLE_CHANGED,
        category: 'admin' as any,
        triggeredByID: 'user-1',
        triggeredAt: new Date(),
        receiverID: 'user-2',
        payload: {} as any,
      });

      expect(result.spaceID).toBeUndefined();
    });

    it('should extract organizationID for ORGANIZATION_ADMIN_MESSAGE event', () => {
      const payload = { organizationID: 'org-1' };
      notificationRepo.create!.mockImplementation((input: any) => input);

      const result = service.createInAppNotification({
        type: NotificationEvent.ORGANIZATION_ADMIN_MESSAGE,
        category: 'org' as any,
        triggeredByID: 'user-1',
        triggeredAt: new Date(),
        receiverID: 'user-2',
        payload: payload as any,
      });

      expect(result.organizationID).toBe('org-1');
    });

    it('should extract organizationID for ORGANIZATION_ADMIN_MENTIONED event', () => {
      const payload = { organizationID: 'org-2' };
      notificationRepo.create!.mockImplementation((input: any) => input);

      const result = service.createInAppNotification({
        type: NotificationEvent.ORGANIZATION_ADMIN_MENTIONED,
        category: 'org' as any,
        triggeredByID: 'user-1',
        triggeredAt: new Date(),
        receiverID: 'user-2',
        payload: payload as any,
      });

      expect(result.organizationID).toBe('org-2');
    });

    it('should extract no FKs for ORGANIZATION_MESSAGE_SENDER event', () => {
      notificationRepo.create!.mockImplementation((input: any) => input);

      const result = service.createInAppNotification({
        type: NotificationEvent.ORGANIZATION_MESSAGE_SENDER,
        category: 'org' as any,
        triggeredByID: 'user-1',
        triggeredAt: new Date(),
        receiverID: 'user-2',
        payload: {} as any,
      });

      expect(result.organizationID).toBeUndefined();
    });

    it('should extract spaceID and applicationID for SPACE_ADMIN_COMMUNITY_APPLICATION', () => {
      const payload = { spaceID: 'space-1', applicationID: 'app-1' };
      notificationRepo.create!.mockImplementation((input: any) => input);

      const result = service.createInAppNotification({
        type: NotificationEvent.SPACE_ADMIN_COMMUNITY_APPLICATION,
        category: 'admin' as any,
        triggeredByID: 'user-1',
        triggeredAt: new Date(),
        receiverID: 'user-2',
        payload: payload as any,
      });

      expect(result.spaceID).toBe('space-1');
      expect(result.applicationID).toBe('app-1');
    });

    it('should extract spaceID, calloutID, contributionID for SPACE_ADMIN_COLLABORATION_CALLOUT_CONTRIBUTION', () => {
      const payload = {
        spaceID: 'space-1',
        calloutID: 'callout-1',
        contributionID: 'contrib-1',
      };
      notificationRepo.create!.mockImplementation((input: any) => input);

      const result = service.createInAppNotification({
        type: NotificationEvent.SPACE_ADMIN_COLLABORATION_CALLOUT_CONTRIBUTION,
        category: 'admin' as any,
        triggeredByID: 'user-1',
        triggeredAt: new Date(),
        receiverID: 'user-2',
        payload: payload as any,
      });

      expect(result.spaceID).toBe('space-1');
      expect(result.calloutID).toBe('callout-1');
      expect(result.contributionID).toBe('contrib-1');
    });

    it('should extract spaceID and contributorActorId for SPACE_ADMIN_VIRTUAL_COMMUNITY_INVITATION_DECLINED', () => {
      const payload = { spaceID: 'space-1', actorID: 'vc-actor' };
      notificationRepo.create!.mockImplementation((input: any) => input);

      const result = service.createInAppNotification({
        type: NotificationEvent.SPACE_ADMIN_VIRTUAL_COMMUNITY_INVITATION_DECLINED,
        category: 'admin' as any,
        triggeredByID: 'user-1',
        triggeredAt: new Date(),
        receiverID: 'user-2',
        payload: payload as any,
      });

      expect(result.spaceID).toBe('space-1');
      expect(result.contributorActorId).toBe('vc-actor');
    });

    it('should extract spaceID for SPACE_LEAD_COMMUNICATION_MESSAGE', () => {
      const payload = { spaceID: 'space-1' };
      notificationRepo.create!.mockImplementation((input: any) => input);

      const result = service.createInAppNotification({
        type: NotificationEvent.SPACE_LEAD_COMMUNICATION_MESSAGE,
        category: 'member' as any,
        triggeredByID: 'user-1',
        triggeredAt: new Date(),
        receiverID: 'user-2',
        payload: payload as any,
      });

      expect(result.spaceID).toBe('space-1');
    });

    it('should extract spaceID and messageID for SPACE_COMMUNICATION_UPDATE', () => {
      const payload = { spaceID: 'space-1', messageID: 'msg-1' };
      notificationRepo.create!.mockImplementation((input: any) => input);

      const result = service.createInAppNotification({
        type: NotificationEvent.SPACE_COMMUNICATION_UPDATE,
        category: 'member' as any,
        triggeredByID: 'user-1',
        triggeredAt: new Date(),
        receiverID: 'user-2',
        payload: payload as any,
      });

      expect(result.spaceID).toBe('space-1');
      expect(result.messageID).toBe('msg-1');
    });

    it('should extract spaceID and calendarEventID for SPACE_COMMUNITY_CALENDAR_EVENT_CREATED', () => {
      const payload = { spaceID: 'space-1', calendarEventID: 'cal-1' };
      notificationRepo.create!.mockImplementation((input: any) => input);

      const result = service.createInAppNotification({
        type: NotificationEvent.SPACE_COMMUNITY_CALENDAR_EVENT_CREATED,
        category: 'member' as any,
        triggeredByID: 'user-1',
        triggeredAt: new Date(),
        receiverID: 'user-2',
        payload: payload as any,
      });

      expect(result.spaceID).toBe('space-1');
      expect(result.calendarEventID).toBe('cal-1');
    });

    it('should extract spaceID, calendarEventID, messageID, roomID for SPACE_COMMUNITY_CALENDAR_EVENT_COMMENT', () => {
      const payload = {
        spaceID: 'space-1',
        calendarEventID: 'cal-1',
        messageID: 'msg-1',
        roomID: 'room-1',
      };
      notificationRepo.create!.mockImplementation((input: any) => input);

      const result = service.createInAppNotification({
        type: NotificationEvent.SPACE_COMMUNITY_CALENDAR_EVENT_COMMENT,
        category: 'member' as any,
        triggeredByID: 'user-1',
        triggeredAt: new Date(),
        receiverID: 'user-2',
        payload: payload as any,
      });

      expect(result.spaceID).toBe('space-1');
      expect(result.calendarEventID).toBe('cal-1');
      expect(result.messageID).toBe('msg-1');
      expect(result.roomID).toBe('room-1');
    });

    it('should extract spaceID and calloutID for SPACE_COLLABORATION_CALLOUT_PUBLISHED', () => {
      const payload = { spaceID: 'space-1', calloutID: 'callout-1' };
      notificationRepo.create!.mockImplementation((input: any) => input);

      const result = service.createInAppNotification({
        type: NotificationEvent.SPACE_COLLABORATION_CALLOUT_PUBLISHED,
        category: 'member' as any,
        triggeredByID: 'user-1',
        triggeredAt: new Date(),
        receiverID: 'user-2',
        payload: payload as any,
      });

      expect(result.spaceID).toBe('space-1');
      expect(result.calloutID).toBe('callout-1');
    });

    it('should extract spaceID, calloutID, contributionID for SPACE_COLLABORATION_CALLOUT_CONTRIBUTION', () => {
      const payload = {
        spaceID: 'space-1',
        calloutID: 'callout-1',
        contributionID: 'contrib-1',
      };
      notificationRepo.create!.mockImplementation((input: any) => input);

      const result = service.createInAppNotification({
        type: NotificationEvent.SPACE_COLLABORATION_CALLOUT_CONTRIBUTION,
        category: 'member' as any,
        triggeredByID: 'user-1',
        triggeredAt: new Date(),
        receiverID: 'user-2',
        payload: payload as any,
      });

      expect(result.spaceID).toBe('space-1');
      expect(result.calloutID).toBe('callout-1');
      expect(result.contributionID).toBe('contrib-1');
    });

    it('should extract spaceID, calloutID, messageID, roomID for SPACE_COLLABORATION_CALLOUT_COMMENT', () => {
      const payload = {
        spaceID: 'space-1',
        calloutID: 'callout-1',
        messageID: 'msg-1',
        roomID: 'room-1',
      };
      notificationRepo.create!.mockImplementation((input: any) => input);

      const result = service.createInAppNotification({
        type: NotificationEvent.SPACE_COLLABORATION_CALLOUT_COMMENT,
        category: 'member' as any,
        triggeredByID: 'user-1',
        triggeredAt: new Date(),
        receiverID: 'user-2',
        payload: payload as any,
      });

      expect(result.spaceID).toBe('space-1');
      expect(result.calloutID).toBe('callout-1');
      expect(result.messageID).toBe('msg-1');
      expect(result.roomID).toBe('room-1');
    });

    it('should extract all FKs for SPACE_COLLABORATION_CALLOUT_POST_CONTRIBUTION_COMMENT', () => {
      const payload = {
        spaceID: 'space-1',
        calloutID: 'callout-1',
        contributionID: 'contrib-1',
        messageID: 'msg-1',
        roomID: 'room-1',
      };
      notificationRepo.create!.mockImplementation((input: any) => input);

      const result = service.createInAppNotification({
        type: NotificationEvent.SPACE_COLLABORATION_CALLOUT_POST_CONTRIBUTION_COMMENT,
        category: 'member' as any,
        triggeredByID: 'user-1',
        triggeredAt: new Date(),
        receiverID: 'user-2',
        payload: payload as any,
      });

      expect(result.spaceID).toBe('space-1');
      expect(result.calloutID).toBe('callout-1');
      expect(result.contributionID).toBe('contrib-1');
      expect(result.messageID).toBe('msg-1');
      expect(result.roomID).toBe('room-1');
    });

    it('should extract spaceID and invitationID for SPACE_COMMUNITY_INVITATION_USER_PLATFORM', () => {
      const payload = { spaceID: 'space-1', platformInvitationID: 'inv-1' };
      notificationRepo.create!.mockImplementation((input: any) => input);

      const result = service.createInAppNotification({
        type: NotificationEvent.SPACE_COMMUNITY_INVITATION_USER_PLATFORM,
        category: 'member' as any,
        triggeredByID: 'user-1',
        triggeredAt: new Date(),
        receiverID: 'user-2',
        payload: payload as any,
      });

      expect(result.spaceID).toBe('space-1');
      expect(result.invitationID).toBe('inv-1');
    });

    it('should extract userID for USER_SIGN_UP_WELCOME', () => {
      const payload = { userID: 'user-new' };
      notificationRepo.create!.mockImplementation((input: any) => input);

      const result = service.createInAppNotification({
        type: NotificationEvent.USER_SIGN_UP_WELCOME,
        category: 'user' as any,
        triggeredByID: 'user-1',
        triggeredAt: new Date(),
        receiverID: 'user-2',
        payload: payload as any,
      });

      expect(result.userID).toBe('user-new');
    });

    it('should extract spaceID and invitationID for USER_SPACE_COMMUNITY_INVITATION', () => {
      const payload = { spaceID: 'space-1', invitationID: 'inv-1' };
      notificationRepo.create!.mockImplementation((input: any) => input);

      const result = service.createInAppNotification({
        type: NotificationEvent.USER_SPACE_COMMUNITY_INVITATION,
        category: 'user' as any,
        triggeredByID: 'user-1',
        triggeredAt: new Date(),
        receiverID: 'user-2',
        payload: payload as any,
      });

      expect(result.spaceID).toBe('space-1');
      expect(result.invitationID).toBe('inv-1');
    });

    it('should extract spaceID and userID for USER_SPACE_COMMUNITY_JOINED', () => {
      const payload = { spaceID: 'space-1', actorID: 'user-joined' };
      notificationRepo.create!.mockImplementation((input: any) => input);

      const result = service.createInAppNotification({
        type: NotificationEvent.USER_SPACE_COMMUNITY_JOINED,
        category: 'user' as any,
        triggeredByID: 'user-1',
        triggeredAt: new Date(),
        receiverID: 'user-2',
        payload: payload as any,
      });

      expect(result.spaceID).toBe('space-1');
      expect(result.userID).toBe('user-joined');
    });

    it('should extract userID for USER_MESSAGE', () => {
      const payload = { userID: 'user-target' };
      notificationRepo.create!.mockImplementation((input: any) => input);

      const result = service.createInAppNotification({
        type: NotificationEvent.USER_MESSAGE,
        category: 'user' as any,
        triggeredByID: 'user-1',
        triggeredAt: new Date(),
        receiverID: 'user-2',
        payload: payload as any,
      });

      expect(result.userID).toBe('user-target');
    });

    it('should extract userID, messageID, roomID for USER_MENTIONED', () => {
      const payload = {
        userID: 'user-m',
        messageID: 'msg-1',
        roomID: 'room-1',
      };
      notificationRepo.create!.mockImplementation((input: any) => input);

      const result = service.createInAppNotification({
        type: NotificationEvent.USER_MENTIONED,
        category: 'user' as any,
        triggeredByID: 'user-1',
        triggeredAt: new Date(),
        receiverID: 'user-2',
        payload: payload as any,
      });

      expect(result.userID).toBe('user-m');
      expect(result.messageID).toBe('msg-1');
      expect(result.roomID).toBe('room-1');
    });

    it('should extract userID, messageID, roomID for USER_COMMENT_REPLY', () => {
      const payload = {
        userID: 'user-r',
        messageID: 'msg-2',
        roomID: 'room-2',
      };
      notificationRepo.create!.mockImplementation((input: any) => input);

      const result = service.createInAppNotification({
        type: NotificationEvent.USER_COMMENT_REPLY,
        category: 'user' as any,
        triggeredByID: 'user-1',
        triggeredAt: new Date(),
        receiverID: 'user-2',
        payload: payload as any,
      });

      expect(result.userID).toBe('user-r');
      expect(result.messageID).toBe('msg-2');
      expect(result.roomID).toBe('room-2');
    });

    it('should extract spaceID and contributorActorId for VIRTUAL_ADMIN_SPACE_COMMUNITY_INVITATION', () => {
      const payload = {
        space: { id: 'space-vc' },
        virtualContributorID: 'vc-1',
      };
      notificationRepo.create!.mockImplementation((input: any) => input);

      const result = service.createInAppNotification({
        type: NotificationEvent.VIRTUAL_ADMIN_SPACE_COMMUNITY_INVITATION,
        category: 'user' as any,
        triggeredByID: 'user-1',
        triggeredAt: new Date(),
        receiverID: 'user-2',
        payload: payload as any,
      });

      expect(result.spaceID).toBe('space-vc');
      expect(result.contributorActorId).toBe('vc-1');
    });

    it('should extract spaceID for USER_SPACE_COMMUNITY_APPLICATION_DECLINED', () => {
      const payload = { spaceID: 'space-declined' };
      notificationRepo.create!.mockImplementation((input: any) => input);

      const result = service.createInAppNotification({
        type: NotificationEvent.USER_SPACE_COMMUNITY_APPLICATION_DECLINED,
        category: 'user' as any,
        triggeredByID: 'user-1',
        triggeredAt: new Date(),
        receiverID: 'user-2',
        payload: payload as any,
      });

      expect(result.spaceID).toBe('space-declined');
    });

    it('should handle unknown event type without throwing', () => {
      notificationRepo.create!.mockImplementation((input: any) => input);

      const result = service.createInAppNotification({
        type: 'UNKNOWN_EVENT' as NotificationEvent,
        category: 'admin' as any,
        triggeredByID: 'user-1',
        triggeredAt: new Date(),
        receiverID: 'user-2',
        payload: {} as any,
      });

      expect(result).toBeDefined();
    });
  });

  describe('getRawNotificationOrFail', () => {
    it('should return the notification when found', async () => {
      const notification = { id: 'notif-1' } as InAppNotification;
      notificationRepo.findOne!.mockResolvedValue(notification);

      const result = await service.getRawNotificationOrFail('notif-1');

      expect(result).toBe(notification);
    });

    it('should throw EntityNotFoundException when notification not found', async () => {
      notificationRepo.findOne!.mockResolvedValue(null);

      await expect(service.getRawNotificationOrFail('missing')).rejects.toThrow(
        EntityNotFoundException
      );
    });
  });

  describe('getRawNotifications', () => {
    it('should filter by types when filter is provided', async () => {
      notificationRepo.find!.mockResolvedValue([]);

      await service.getRawNotifications('user-1', {
        types: [NotificationEvent.USER_MESSAGE],
      });

      expect(notificationRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            receiverID: 'user-1',
            type: expect.anything(),
          }),
        })
      );
    });

    it('should not filter by types when filter is empty', async () => {
      notificationRepo.find!.mockResolvedValue([]);

      await service.getRawNotifications('user-1');

      expect(notificationRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { receiverID: 'user-1' },
        })
      );
    });
  });

  describe('deleteAllForReceiverInSpaces', () => {
    it('should return early without calling delete when spaceIDs is empty', async () => {
      await service.deleteAllForReceiverInSpaces('user-1', []);

      expect(notificationRepo.delete).not.toHaveBeenCalled();
    });

    it('should call delete with In clause when spaceIDs are provided', async () => {
      notificationRepo.delete!.mockResolvedValue({ affected: 2 });

      await service.deleteAllForReceiverInSpaces('user-1', [
        'space-1',
        'space-2',
      ]);

      expect(notificationRepo.delete).toHaveBeenCalledWith(
        expect.objectContaining({
          receiverID: 'user-1',
        })
      );
    });
  });

  describe('deleteAllForContributorActorInSpaces', () => {
    it('should return early without calling delete when spaceIDs is empty', async () => {
      await service.deleteAllForContributorActorInSpaces('actor-1', []);

      expect(notificationRepo.delete).not.toHaveBeenCalled();
    });

    it('should call delete when spaceIDs are provided', async () => {
      notificationRepo.delete!.mockResolvedValue({ affected: 1 });

      await service.deleteAllForContributorActorInSpaces('actor-1', [
        'space-1',
      ]);

      expect(notificationRepo.delete).toHaveBeenCalled();
    });
  });

  describe('updateNotificationState', () => {
    it('should update and persist the notification state', async () => {
      const notification = {
        id: 'notif-1',
        state: NotificationEventInAppState.UNREAD,
      } as InAppNotification;
      notificationRepo.findOne!.mockResolvedValue(notification);
      notificationRepo.save!.mockResolvedValue({
        ...notification,
        state: NotificationEventInAppState.READ,
      });

      const result = await service.updateNotificationState(
        'notif-1',
        NotificationEventInAppState.READ
      );

      expect(result).toBe(NotificationEventInAppState.READ);
      expect(notificationRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ state: NotificationEventInAppState.READ })
      );
    });
  });

  describe('getRawNotificationsUnreadCount', () => {
    it('should count unread notifications without filter', async () => {
      notificationRepo.count!.mockResolvedValue(5);

      const result = await service.getRawNotificationsUnreadCount('user-1');

      expect(notificationRepo.count).toHaveBeenCalledWith({
        where: {
          receiverID: 'user-1',
          state: NotificationEventInAppState.UNREAD,
        },
      });
      expect(result).toBe(5);
    });

    it('should count unread notifications with type filter', async () => {
      notificationRepo.count!.mockResolvedValue(2);

      const result = await service.getRawNotificationsUnreadCount('user-1', {
        types: [NotificationEvent.USER_MESSAGE],
      });

      expect(result).toBe(2);
    });
  });

  describe('saveInAppNotifications', () => {
    it('should save entities in chunks of 100', async () => {
      const entities = [{ id: '1' }] as any;
      notificationRepo.save!.mockResolvedValue(entities);

      const result = await service.saveInAppNotifications(entities);

      expect(notificationRepo.save).toHaveBeenCalledWith(entities, {
        chunk: 100,
      });
      expect(result).toBe(entities);
    });
  });

  describe('deleteAllByMessageId', () => {
    it('should delete by messageID', async () => {
      notificationRepo.delete!.mockResolvedValue({ affected: 1 });

      await service.deleteAllByMessageId('msg-1');

      expect(notificationRepo.delete).toHaveBeenCalledWith({
        messageID: 'msg-1',
      });
    });
  });

  describe('deleteAllForReceiverInSpace', () => {
    it('should delete by receiverID and spaceID', async () => {
      notificationRepo.delete!.mockResolvedValue({ affected: 1 });

      await service.deleteAllForReceiverInSpace('user-1', 'space-1');

      expect(notificationRepo.delete).toHaveBeenCalledWith({
        receiverID: 'user-1',
        spaceID: 'space-1',
      });
    });
  });

  describe('deleteAllForReceiverInOrganization', () => {
    it('should delete by receiverID and organizationID', async () => {
      notificationRepo.delete!.mockResolvedValue({ affected: 1 });

      await service.deleteAllForReceiverInOrganization('user-1', 'org-1');

      expect(notificationRepo.delete).toHaveBeenCalledWith({
        receiverID: 'user-1',
        organizationID: 'org-1',
      });
    });
  });

  describe('deleteAllForContributorActorInSpace', () => {
    it('should delete by contributorActorId and spaceID', async () => {
      notificationRepo.delete!.mockResolvedValue({ affected: 1 });

      await service.deleteAllForContributorActorInSpace('actor-1', 'space-1');

      expect(notificationRepo.delete).toHaveBeenCalledWith({
        contributorActorId: 'actor-1',
        spaceID: 'space-1',
      });
    });
  });

  describe('getPaginatedNotifications', () => {
    const createChainableQb = () => {
      const qb: any = {
        where: vi.fn(),
        andWhere: vi.fn(),
        orderBy: vi.fn(),
        addOrderBy: vi.fn(),
        take: vi.fn(),
        skip: vi.fn(),
        clone: vi.fn(),
        getMany: vi.fn().mockResolvedValue([]),
        getCount: vi.fn().mockResolvedValue(0),
        getManyAndCount: vi.fn().mockResolvedValue([[], 0]),
        expressionMap: { orderBys: {}, wheres: [] },
      };
      qb.where.mockReturnValue(qb);
      qb.andWhere.mockReturnValue(qb);
      qb.orderBy.mockReturnValue(qb);
      qb.addOrderBy.mockReturnValue(qb);
      qb.take.mockReturnValue(qb);
      qb.skip.mockReturnValue(qb);
      qb.clone.mockReturnValue(qb);
      return qb;
    };

    it('should build paginated query without filter', async () => {
      const qb = createChainableQb();
      notificationRepo.createQueryBuilder!.mockReturnValue(qb);

      await service.getPaginatedNotifications('user-1', { first: 10 });

      expect(qb.where).toHaveBeenCalled();
      expect(qb.andWhere).toHaveBeenCalled(); // archived state filter
      expect(qb.orderBy).toHaveBeenCalled();
    });

    it('should add type filter when provided', async () => {
      const qb = createChainableQb();
      notificationRepo.createQueryBuilder!.mockReturnValue(qb);

      await service.getPaginatedNotifications(
        'user-1',
        { first: 10 },
        {
          types: [NotificationEvent.USER_MESSAGE],
        }
      );

      // Where + archived state + types filter
      expect(qb.andWhere).toHaveBeenCalledTimes(2);
    });

    it('should use cursor-based pagination when after is provided', async () => {
      const qb = createChainableQb();
      notificationRepo.createQueryBuilder!.mockReturnValue(qb);

      const cursorNotification = {
        id: 'cursor-1',
        triggeredAt: new Date('2024-01-01'),
      } as any;
      notificationRepo.findOne!.mockResolvedValue(cursorNotification);

      await service.getPaginatedNotifications('user-1', {
        first: 10,
        after: 'cursor-1',
      });

      expect(qb.addOrderBy).toHaveBeenCalled();
      expect(notificationRepo.findOne).toHaveBeenCalled();
    });

    it('should use cursor-based pagination when before is provided', async () => {
      const qb = createChainableQb();
      notificationRepo.createQueryBuilder!.mockReturnValue(qb);

      const cursorNotification = {
        id: 'cursor-1',
        triggeredAt: new Date('2024-01-15'),
      } as any;
      notificationRepo.findOne!.mockResolvedValue(cursorNotification);

      await service.getPaginatedNotifications('user-1', {
        last: 5,
        before: 'cursor-1',
      });

      expect(notificationRepo.findOne).toHaveBeenCalled();
    });

    it('should handle cursor not found gracefully', async () => {
      const qb = createChainableQb();
      notificationRepo.createQueryBuilder!.mockReturnValue(qb);
      notificationRepo.findOne!.mockResolvedValue(null);

      // Should not throw
      await service.getPaginatedNotifications('user-1', {
        first: 10,
        after: 'nonexistent',
      });

      expect(qb.take).toHaveBeenCalled();
    });

    it('should determine hasNextPage when more items than limit', async () => {
      const qb = createChainableQb();
      const items = Array.from({ length: 11 }, (_, i) => ({ id: `n-${i}` }));
      qb.getMany.mockResolvedValue(items);
      qb.getCount.mockResolvedValue(20);
      notificationRepo.createQueryBuilder!.mockReturnValue(qb);

      const cursorNotification = {
        id: 'cursor-1',
        triggeredAt: new Date(),
      } as any;
      notificationRepo.findOne!.mockResolvedValue(cursorNotification);

      const result = await service.getPaginatedNotifications('user-1', {
        first: 10,
        after: 'cursor-1',
      });

      expect(result.pageInfo.hasNextPage).toBe(true);
      expect(result.items).toHaveLength(10);
    });
  });

  describe('bulkUpdateNotificationStateByTypes', () => {
    it('should include type filter when types are provided', async () => {
      notificationRepo.update!.mockResolvedValue({ affected: 5 });

      await service.bulkUpdateNotificationStateByTypes(
        'user-1',
        NotificationEventInAppState.READ,
        { types: [NotificationEvent.USER_MESSAGE] }
      );

      expect(notificationRepo.update).toHaveBeenCalledWith(
        expect.objectContaining({
          receiverID: 'user-1',
          type: expect.anything(),
        }),
        { state: NotificationEventInAppState.READ }
      );
    });

    it('should update all non-archived notifications when no filter provided', async () => {
      notificationRepo.update!.mockResolvedValue({ affected: 10 });

      await service.bulkUpdateNotificationStateByTypes(
        'user-1',
        NotificationEventInAppState.READ
      );

      const updateCall = notificationRepo.update!.mock.calls[0];
      expect(updateCall[0]).toEqual(
        expect.objectContaining({
          receiverID: 'user-1',
        })
      );
      expect(updateCall[0].type).toBeUndefined();
    });
  });
});
