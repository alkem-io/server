import { NotificationEvent } from '@common/enums/notification.event';
import { NotificationEventCategory } from '@common/enums/notification.event.category';
import { Test, TestingModule } from '@nestjs/testing';
import { InAppNotificationService } from '@platform/in-app-notification/in.app.notification.service';
import { SubscriptionPublishService } from '@services/subscriptions/subscription-service';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { vi } from 'vitest';
import { NotificationInAppAdapter } from './notification.in.app.adapter';

describe('NotificationInAppAdapter', () => {
  let adapter: NotificationInAppAdapter;
  let inAppNotificationService: InAppNotificationService;
  let subscriptionPublishService: SubscriptionPublishService;

  const mockLogger = {
    error: vi.fn(),
    warn: vi.fn(),
    verbose: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationInAppAdapter,
        {
          provide: WINSTON_MODULE_NEST_PROVIDER,
          useValue: mockLogger,
        },
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    adapter = module.get<NotificationInAppAdapter>(NotificationInAppAdapter);
    inAppNotificationService = module.get<InAppNotificationService>(
      InAppNotificationService
    );
    subscriptionPublishService = module.get<SubscriptionPublishService>(
      SubscriptionPublishService
    );
  });

  it('should be defined', () => {
    expect(adapter).toBeDefined();
  });

  describe('sendInAppNotifications', () => {
    it('should skip unsupported event types', async () => {
      await adapter.sendInAppNotifications(
        NotificationEvent.SPACE_COMMUNITY_INVITATION_USER_PLATFORM,
        NotificationEventCategory.SPACE_MEMBER,
        'user-1',
        ['user-2'],
        {} as any
      );

      expect(
        inAppNotificationService.createInAppNotification
      ).not.toHaveBeenCalled();
    });

    it('should skip when receiverIDs is empty', async () => {
      await adapter.sendInAppNotifications(
        NotificationEvent.USER_MESSAGE,
        NotificationEventCategory.USER,
        'user-1',
        [],
        {} as any
      );

      expect(
        inAppNotificationService.createInAppNotification
      ).not.toHaveBeenCalled();
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should create notifications for each receiver', async () => {
      const mockNotification = { id: 'notif-1', receiverID: 'user-2' };
      vi.mocked(
        inAppNotificationService.createInAppNotification
      ).mockReturnValue(mockNotification as any);
      vi.mocked(
        inAppNotificationService.saveInAppNotifications
      ).mockResolvedValue([mockNotification] as any);
      vi.mocked(
        inAppNotificationService.getRawNotificationsUnreadCount
      ).mockResolvedValue(5);
      vi.mocked(
        subscriptionPublishService.publishInAppNotificationReceived
      ).mockResolvedValue(undefined);
      vi.mocked(
        subscriptionPublishService.publishInAppNotificationCounter
      ).mockResolvedValue(undefined);

      await adapter.sendInAppNotifications(
        NotificationEvent.USER_MESSAGE,
        NotificationEventCategory.USER,
        'user-1',
        ['user-2'],
        {} as any
      );

      expect(
        inAppNotificationService.createInAppNotification
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          type: NotificationEvent.USER_MESSAGE,
          category: NotificationEventCategory.USER,
          triggeredByID: 'user-1',
          receiverID: 'user-2',
        })
      );
      expect(
        inAppNotificationService.saveInAppNotifications
      ).toHaveBeenCalled();
    });

    it('should publish notifications and update counters', async () => {
      const savedNotifications = [
        { id: 'notif-1', receiverID: 'user-2' },
        { id: 'notif-2', receiverID: 'user-3' },
      ];
      vi.mocked(
        inAppNotificationService.createInAppNotification
      ).mockReturnValue({} as any);
      vi.mocked(
        inAppNotificationService.saveInAppNotifications
      ).mockResolvedValue(savedNotifications as any);
      vi.mocked(
        inAppNotificationService.getRawNotificationsUnreadCount
      ).mockResolvedValue(3);
      vi.mocked(
        subscriptionPublishService.publishInAppNotificationReceived
      ).mockResolvedValue(undefined);
      vi.mocked(
        subscriptionPublishService.publishInAppNotificationCounter
      ).mockResolvedValue(undefined);

      await adapter.sendInAppNotifications(
        NotificationEvent.USER_MESSAGE,
        NotificationEventCategory.USER,
        'user-1',
        ['user-2', 'user-3'],
        {} as any
      );

      expect(
        subscriptionPublishService.publishInAppNotificationReceived
      ).toHaveBeenCalledTimes(2);
      expect(
        subscriptionPublishService.publishInAppNotificationCounter
      ).toHaveBeenCalledTimes(2);
    });

    it('should handle counter update failures gracefully', async () => {
      const savedNotifications = [{ id: 'notif-1', receiverID: 'user-2' }];
      vi.mocked(
        inAppNotificationService.createInAppNotification
      ).mockReturnValue({} as any);
      vi.mocked(
        inAppNotificationService.saveInAppNotifications
      ).mockResolvedValue(savedNotifications as any);
      vi.mocked(
        subscriptionPublishService.publishInAppNotificationReceived
      ).mockResolvedValue(undefined);
      vi.mocked(
        inAppNotificationService.getRawNotificationsUnreadCount
      ).mockResolvedValue(1);
      vi.mocked(
        subscriptionPublishService.publishInAppNotificationCounter
      ).mockRejectedValue(new Error('Counter update failed'));

      // Should not throw
      await expect(
        adapter.sendInAppNotifications(
          NotificationEvent.USER_MESSAGE,
          NotificationEventCategory.USER,
          'user-1',
          ['user-2'],
          {} as any
        )
      ).resolves.not.toThrow();
    });

    it('should deduplicate receiver IDs for counter updates', async () => {
      const savedNotifications = [
        { id: 'notif-1', receiverID: 'user-2' },
        { id: 'notif-2', receiverID: 'user-2' },
      ];
      vi.mocked(
        inAppNotificationService.createInAppNotification
      ).mockReturnValue({} as any);
      vi.mocked(
        inAppNotificationService.saveInAppNotifications
      ).mockResolvedValue(savedNotifications as any);
      vi.mocked(
        inAppNotificationService.getRawNotificationsUnreadCount
      ).mockResolvedValue(2);
      vi.mocked(
        subscriptionPublishService.publishInAppNotificationReceived
      ).mockResolvedValue(undefined);
      vi.mocked(
        subscriptionPublishService.publishInAppNotificationCounter
      ).mockResolvedValue(undefined);

      await adapter.sendInAppNotifications(
        NotificationEvent.USER_MESSAGE,
        NotificationEventCategory.USER,
        'user-1',
        ['user-2', 'user-2'],
        {} as any
      );

      // Counter should only be updated once for the unique receiver
      expect(
        subscriptionPublishService.publishInAppNotificationCounter
      ).toHaveBeenCalledTimes(1);
    });
  });
});
