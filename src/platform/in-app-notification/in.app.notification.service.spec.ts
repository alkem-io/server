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

    it('should extract contributorUserID for SPACE_ADMIN_COMMUNITY_NEW_MEMBER with USER type', () => {
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

      expect(result.contributorUserID).toBe('user-contributor');
      expect(result.contributorOrganizationID).toBeUndefined();
      expect(result.contributorVcID).toBeUndefined();
      expect(result.spaceID).toBe('space-1');
    });

    it('should extract contributorOrganizationID for SPACE_ADMIN_COMMUNITY_NEW_MEMBER with ORGANIZATION type', () => {
      const payload = {
        spaceID: 'space-1',
        actorType: ActorType.ORGANIZATION,
        actorID: 'org-contributor',
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

      expect(result.contributorOrganizationID).toBe('org-contributor');
      expect(result.contributorUserID).toBeUndefined();
      expect(result.contributorVcID).toBeUndefined();
    });

    it('should extract contributorVcID for SPACE_ADMIN_COMMUNITY_NEW_MEMBER with VIRTUAL type', () => {
      const payload = {
        spaceID: 'space-1',
        actorType: ActorType.VIRTUAL_CONTRIBUTOR,
        actorID: 'vc-contributor',
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

      expect(result.contributorVcID).toBe('vc-contributor');
      expect(result.contributorUserID).toBeUndefined();
      expect(result.contributorOrganizationID).toBeUndefined();
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

  describe('deleteAllForContributorVcInSpaces', () => {
    it('should return early without calling delete when spaceIDs is empty', async () => {
      await service.deleteAllForContributorVcInSpaces('vc-1', []);

      expect(notificationRepo.delete).not.toHaveBeenCalled();
    });

    it('should call delete when spaceIDs are provided', async () => {
      notificationRepo.delete!.mockResolvedValue({ affected: 1 });

      await service.deleteAllForContributorVcInSpaces('vc-1', ['space-1']);

      expect(notificationRepo.delete).toHaveBeenCalled();
    });
  });

  describe('deleteAllForContributorOrganizationInSpaces', () => {
    it('should return early without calling delete when spaceIDs is empty', async () => {
      await service.deleteAllForContributorOrganizationInSpaces('org-1', []);

      expect(notificationRepo.delete).not.toHaveBeenCalled();
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
