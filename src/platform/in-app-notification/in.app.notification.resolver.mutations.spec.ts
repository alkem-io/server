import { NotificationEventInAppState } from '@common/enums/notification.event.in.app.state';
import { ForbiddenException } from '@common/exceptions';
import { Test, TestingModule } from '@nestjs/testing';
import { SubscriptionPublishService } from '@services/subscriptions/subscription-service';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mocked } from 'vitest';
import { InAppNotificationResolverMutations } from './in.app.notification.resolver.mutations';
import { InAppNotificationService } from './in.app.notification.service';

describe('InAppNotificationResolverMutations', () => {
  let resolver: InAppNotificationResolverMutations;
  let inAppNotificationService: Mocked<InAppNotificationService>;
  let subscriptionPublishService: Mocked<SubscriptionPublishService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [InAppNotificationResolverMutations, MockWinstonProvider],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    resolver = module.get(InAppNotificationResolverMutations);
    inAppNotificationService = module.get(
      InAppNotificationService
    ) as Mocked<InAppNotificationService>;
    subscriptionPublishService = module.get(
      SubscriptionPublishService
    ) as Mocked<SubscriptionPublishService>;
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  describe('updateNotificationState', () => {
    const actorContext = { actorID: 'user-1' } as any;

    it('should update notification state when user owns the notification', async () => {
      const notification = { id: 'notif-1', receiverID: 'user-1' } as any;
      inAppNotificationService.getRawNotificationOrFail.mockResolvedValue(
        notification
      );
      inAppNotificationService.updateNotificationState.mockResolvedValue(
        NotificationEventInAppState.READ
      );
      inAppNotificationService.getRawNotificationsUnreadCount.mockResolvedValue(
        3
      );
      subscriptionPublishService.publishInAppNotificationCounter.mockResolvedValue(
        undefined as any
      );

      const result = await resolver.updateNotificationState(actorContext, {
        ID: 'notif-1',
        state: NotificationEventInAppState.READ,
      });

      expect(result).toBe(NotificationEventInAppState.READ);
      expect(
        inAppNotificationService.updateNotificationState
      ).toHaveBeenCalledWith('notif-1', NotificationEventInAppState.READ);
      expect(
        subscriptionPublishService.publishInAppNotificationCounter
      ).toHaveBeenCalledWith('user-1', 3);
    });

    it('should throw ForbiddenException when user does not own the notification', async () => {
      const notification = { id: 'notif-1', receiverID: 'other-user' } as any;
      inAppNotificationService.getRawNotificationOrFail.mockResolvedValue(
        notification
      );

      await expect(
        resolver.updateNotificationState(actorContext, {
          ID: 'notif-1',
          state: NotificationEventInAppState.READ,
        })
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('markNotificationsAsRead', () => {
    const actorContext = { actorID: 'user-1' } as any;

    it('should mark notifications as read and return true when affected', async () => {
      inAppNotificationService.bulkUpdateNotificationStateByTypes.mockResolvedValue(
        {
          affected: 5,
        } as any
      );
      inAppNotificationService.getRawNotificationsUnreadCount.mockResolvedValue(
        0
      );
      subscriptionPublishService.publishInAppNotificationCounter.mockResolvedValue(
        undefined as any
      );

      const result = await resolver.markNotificationsAsRead(actorContext);

      expect(result).toBe(true);
      expect(
        inAppNotificationService.bulkUpdateNotificationStateByTypes
      ).toHaveBeenCalledWith(
        'user-1',
        NotificationEventInAppState.READ,
        undefined
      );
      expect(
        subscriptionPublishService.publishInAppNotificationCounter
      ).toHaveBeenCalled();
    });

    it('should return false when no notifications were affected', async () => {
      inAppNotificationService.bulkUpdateNotificationStateByTypes.mockResolvedValue(
        {
          affected: 0,
        } as any
      );

      const result = await resolver.markNotificationsAsRead(actorContext);

      expect(result).toBe(false);
    });

    it('should pass filter to bulk update when provided', async () => {
      const filter = { types: ['USER_MESSAGE' as any] };
      inAppNotificationService.bulkUpdateNotificationStateByTypes.mockResolvedValue(
        {
          affected: 2,
        } as any
      );
      inAppNotificationService.getRawNotificationsUnreadCount.mockResolvedValue(
        1
      );
      subscriptionPublishService.publishInAppNotificationCounter.mockResolvedValue(
        undefined as any
      );

      await resolver.markNotificationsAsRead(actorContext, filter);

      expect(
        inAppNotificationService.bulkUpdateNotificationStateByTypes
      ).toHaveBeenCalledWith(
        'user-1',
        NotificationEventInAppState.READ,
        filter
      );
    });
  });

  describe('markNotificationsAsUnread', () => {
    const actorContext = { actorID: 'user-1' } as any;

    it('should mark notifications as unread', async () => {
      inAppNotificationService.bulkUpdateNotificationStateByTypes.mockResolvedValue(
        {
          affected: 3,
        } as any
      );
      inAppNotificationService.getRawNotificationsUnreadCount.mockResolvedValue(
        3
      );
      subscriptionPublishService.publishInAppNotificationCounter.mockResolvedValue(
        undefined as any
      );

      const result = await resolver.markNotificationsAsUnread(actorContext);

      expect(result).toBe(true);
      expect(
        inAppNotificationService.bulkUpdateNotificationStateByTypes
      ).toHaveBeenCalledWith(
        'user-1',
        NotificationEventInAppState.UNREAD,
        undefined
      );
    });

    it('should handle undefined affected (unsupported driver)', async () => {
      inAppNotificationService.bulkUpdateNotificationStateByTypes.mockResolvedValue(
        {
          affected: undefined,
        } as any
      );

      const result = await resolver.markNotificationsAsUnread(actorContext);

      expect(result).toBe(false);
    });
  });
});
