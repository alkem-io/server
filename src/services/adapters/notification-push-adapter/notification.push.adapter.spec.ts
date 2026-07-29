import { NotificationEvent } from '@common/enums/notification.event';
import { PushSubscriptionService } from '@domain/push-subscription/push.subscription.service';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MessagingPushBudgetService } from './messaging.push.budget.service';
import { NotificationPushAdapter } from './notification.push.adapter';
import { PushThrottleService } from './push.throttle.service';

const mockConfigService = {
  get: vi.fn((_key: string): boolean | undefined => {
    if (_key === 'notifications.push.enabled') return true;
    return undefined;
  }),
};

const mockPushSubscriptionService = {
  getActiveSubscriptions: vi.fn(),
};

const mockPushThrottleService = {
  isAllowed: vi.fn(),
};

const mockMessagingPushBudgetService = {
  isAllowed: vi.fn(),
};

const mockAmqpConnection = {
  publish: vi.fn(),
};

const createUser = (id: string) => ({ id, email: `${id}@test.com` }) as any;

describe('NotificationPushAdapter', () => {
  let adapter: NotificationPushAdapter;

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationPushAdapter,
        {
          provide: PushSubscriptionService,
          useValue: mockPushSubscriptionService,
        },
        {
          provide: PushThrottleService,
          useValue: mockPushThrottleService,
        },
        {
          provide: MessagingPushBudgetService,
          useValue: mockMessagingPushBudgetService,
        },
        { provide: AmqpConnection, useValue: mockAmqpConnection },
        { provide: ConfigService, useValue: mockConfigService },
        MockWinstonProvider,
      ],
    }).compile();

    adapter = module.get<NotificationPushAdapter>(NotificationPushAdapter);
  });

  it('should be defined', () => {
    expect(adapter).toBeDefined();
  });

  describe('sendPushNotifications', () => {
    it('should check throttle per user, lookup subscriptions, and publish', async () => {
      const users = [createUser('user-1'), createUser('user-2')];
      mockPushThrottleService.isAllowed.mockResolvedValue(true);
      mockPushSubscriptionService.getActiveSubscriptions.mockResolvedValue([
        {
          id: 'sub-1',
          userId: 'user-1',
          endpoint: 'https://push.example.com/1',
          p256dh: 'key1',
          auth: 'auth1',
        },
        {
          id: 'sub-2',
          userId: 'user-2',
          endpoint: 'https://push.example.com/2',
          p256dh: 'key2',
          auth: 'auth2',
        },
      ]);

      await adapter.sendPushNotifications(
        users,
        NotificationEvent.USER_MENTIONED,
        { title: 'Test', body: 'Test body', url: '/test' }
      );

      expect(mockPushThrottleService.isAllowed).toHaveBeenCalledTimes(2);
      expect(mockAmqpConnection.publish).toHaveBeenCalledTimes(2);
    });

    it('should skip when push is disabled', async () => {
      // Create adapter with push disabled
      mockConfigService.get.mockReturnValue(false);
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          NotificationPushAdapter,
          {
            provide: PushSubscriptionService,
            useValue: mockPushSubscriptionService,
          },
          {
            provide: PushThrottleService,
            useValue: mockPushThrottleService,
          },
          {
            provide: MessagingPushBudgetService,
            useValue: mockMessagingPushBudgetService,
          },
          { provide: AmqpConnection, useValue: mockAmqpConnection },
          { provide: ConfigService, useValue: mockConfigService },
          MockWinstonProvider,
        ],
      }).compile();

      const disabledAdapter = module.get<NotificationPushAdapter>(
        NotificationPushAdapter
      );

      await disabledAdapter.sendPushNotifications(
        [createUser('user-1')],
        NotificationEvent.USER_MENTIONED,
        { title: 'Test', body: 'Test body', url: '/test' }
      );

      expect(mockPushThrottleService.isAllowed).not.toHaveBeenCalled();
      // Reset config
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'notifications.push.enabled') return true;
        return undefined;
      });
    });

    it('should skip when pushRecipients array is empty', async () => {
      await adapter.sendPushNotifications(
        [],
        NotificationEvent.USER_MENTIONED,
        { title: 'Test', body: 'Test body', url: '/test' }
      );

      expect(mockPushThrottleService.isAllowed).not.toHaveBeenCalled();
    });

    it('should drop throttled users silently', async () => {
      const users = [createUser('user-1'), createUser('user-2')];
      mockPushThrottleService.isAllowed.mockResolvedValueOnce(true);
      mockPushThrottleService.isAllowed.mockResolvedValueOnce(false);
      mockPushSubscriptionService.getActiveSubscriptions.mockResolvedValue([
        {
          id: 'sub-1',
          userId: 'user-1',
          endpoint: 'https://push.example.com/1',
          p256dh: 'key1',
          auth: 'auth1',
        },
      ]);

      await adapter.sendPushNotifications(
        users,
        NotificationEvent.USER_MENTIONED,
        { title: 'Test', body: 'Test body', url: '/test' }
      );

      // Only user-1 was allowed, so only their subscription is queued
      expect(
        mockPushSubscriptionService.getActiveSubscriptions
      ).toHaveBeenCalledWith(['user-1']);
      expect(mockAmqpConnection.publish).toHaveBeenCalledTimes(1);
    });
  });

  describe('sendMessagingPushNotifications', () => {
    it('gates on the messaging push budget, never the shared throttle', async () => {
      const users = [createUser('user-1')];
      mockMessagingPushBudgetService.isAllowed.mockResolvedValue(true);
      mockPushSubscriptionService.getActiveSubscriptions.mockResolvedValue([
        {
          id: 'sub-1',
          userId: 'user-1',
          endpoint: 'https://push.example.com/1',
          p256dh: 'key1',
          auth: 'auth1',
        },
      ]);

      await adapter.sendMessagingPushNotifications(
        users,
        NotificationEvent.USER_CONVERSATION_MESSAGE_DIRECT,
        { title: 'Alice', body: 'Alice sent you a message', url: '/?chat=1' }
      );

      expect(mockMessagingPushBudgetService.isAllowed).toHaveBeenCalledWith(
        'user-1'
      );
      expect(mockPushThrottleService.isAllowed).not.toHaveBeenCalled();
      expect(mockAmqpConnection.publish).toHaveBeenCalledTimes(1);
    });

    it('drops recipients whose messaging push budget is exhausted', async () => {
      mockMessagingPushBudgetService.isAllowed.mockResolvedValue(false);

      await adapter.sendMessagingPushNotifications(
        [createUser('user-1')],
        NotificationEvent.USER_CONVERSATION_MESSAGE_DIRECT,
        { title: 'Alice', body: 'Alice sent you a message', url: '/?chat=1' }
      );

      expect(
        mockPushSubscriptionService.getActiveSubscriptions
      ).not.toHaveBeenCalled();
    });
  });
});
