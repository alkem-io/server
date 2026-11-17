import { NotificationEvent } from '@common/enums/notification.event';
import { DevicePushTokenService } from '@domain/device-push-token/device.push.token.service';
import { PushSubscriptionService } from '@domain/push-subscription/push.subscription.service';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { beforeEach, describe, expect, it, vi } from 'vitest';
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

const mockDevicePushTokenService = {
  getTokensForUsers: vi.fn(),
  incrementBadgeCount: vi.fn(),
};

const mockPushThrottleService = {
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
    // Default: no device tokens, so every pre-existing case keeps its counts.
    mockDevicePushTokenService.getTokensForUsers.mockResolvedValue([]);
    mockDevicePushTokenService.incrementBadgeCount.mockResolvedValue(3);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationPushAdapter,
        {
          provide: PushSubscriptionService,
          useValue: mockPushSubscriptionService,
        },
        {
          provide: DevicePushTokenService,
          useValue: mockDevicePushTokenService,
        },
        {
          provide: PushThrottleService,
          useValue: mockPushThrottleService,
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
            provide: DevicePushTokenService,
            useValue: mockDevicePushTokenService,
          },
          {
            provide: PushThrottleService,
            useValue: mockPushThrottleService,
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

  describe('native device-token fan-out', () => {
    const activeSubscription = {
      id: 'sub-1',
      userId: 'user-1',
      endpoint: 'https://push.example.com/1',
      p256dh: 'key1',
      auth: 'auth1',
    };
    const deviceToken = {
      id: 'tok-row-1',
      userId: 'user-1',
      token: 'device-token-1',
      platform: 'ios',
    };

    it('publishes one web and one native message for a recipient holding both', async () => {
      mockPushThrottleService.isAllowed.mockResolvedValue(true);
      mockPushSubscriptionService.getActiveSubscriptions.mockResolvedValue([
        activeSubscription,
      ]);
      mockDevicePushTokenService.getTokensForUsers.mockResolvedValue([
        deviceToken,
      ]);

      await adapter.sendPushNotifications(
        [createUser('user-1')],
        NotificationEvent.USER_MENTIONED,
        { title: 'Test', body: 'Test body', url: '/test' }
      );

      expect(mockAmqpConnection.publish).toHaveBeenCalledTimes(2);
      const [, , webMessage] = mockAmqpConnection.publish.mock.calls[0];
      const [, , nativeMessage] = mockAmqpConnection.publish.mock.calls[1];

      // The web shape is byte-identical to today's.
      expect(webMessage).toEqual({
        subscriptionId: 'sub-1',
        userId: 'user-1',
        endpoint: 'https://push.example.com/1',
        keys: { p256dh: 'key1', auth: 'auth1' },
        payload: {
          title: 'Test',
          body: 'Test body',
          url: '/test',
          eventType: NotificationEvent.USER_MENTIONED,
          timestamp: webMessage.payload.timestamp,
        },
        retryCount: 0,
      });
      expect(nativeMessage).toEqual({
        userId: 'user-1',
        platform: 'ios',
        token: 'device-token-1',
        payload: webMessage.payload,
        badge: 3,
      });
    });

    // SC-015 — the MVP's primary recipient: a phone and no browser
    // subscription at all. The unwidened early return dropped them silently.
    it('publishes exactly one native message for a recipient with NO web subscription', async () => {
      mockPushThrottleService.isAllowed.mockResolvedValue(true);
      mockPushSubscriptionService.getActiveSubscriptions.mockResolvedValue([]);
      mockDevicePushTokenService.getTokensForUsers.mockResolvedValue([
        deviceToken,
      ]);

      await adapter.sendPushNotifications(
        [createUser('user-1')],
        NotificationEvent.USER_MENTIONED,
        { title: 'Test', body: 'Test body', url: '/test' }
      );

      expect(mockAmqpConnection.publish).toHaveBeenCalledTimes(1);
      const [, , message] = mockAmqpConnection.publish.mock.calls[0];
      expect(message).toMatchObject({
        platform: 'ios',
        token: 'device-token-1',
      });
    });
  });

  describe('the iOS badge counter', () => {
    const token = (userId: string, name: string, platform: string) => ({
      id: `row-${name}`,
      userId,
      token: name,
      platform,
    });
    const send = (userIds: string[]) =>
      adapter.sendPushNotifications(
        userIds.map(createUser),
        NotificationEvent.USER_MENTIONED,
        { title: 'Test', body: 'Test body', url: '/test' }
      );
    const publishedFor = (tokenValue: string) =>
      mockAmqpConnection.publish.mock.calls
        .map(([, , message]) => message)
        .find(message => message.token === tokenValue);

    beforeEach(() => {
      mockPushThrottleService.isAllowed.mockResolvedValue(true);
      mockPushSubscriptionService.getActiveSubscriptions.mockResolvedValue([]);
    });

    it('counts one per user per dispatch across several iOS tokens', async () => {
      mockDevicePushTokenService.getTokensForUsers.mockResolvedValue([
        token('user-1', 'phone', 'ios'),
        token('user-1', 'tablet', 'ios'),
      ]);

      await send(['user-1']);

      expect(
        mockDevicePushTokenService.incrementBadgeCount
      ).toHaveBeenCalledTimes(1);
      expect(publishedFor('phone').badge).toBe(3);
      expect(publishedFor('tablet').badge).toBe(3);
    });

    it('does not count a user with no iOS token', async () => {
      mockPushSubscriptionService.getActiveSubscriptions.mockResolvedValue([
        {
          id: 'sub-1',
          userId: 'user-web',
          endpoint: 'https://push.example.com/1',
          p256dh: 'key1',
          auth: 'auth1',
        },
      ]);
      mockDevicePushTokenService.getTokensForUsers.mockResolvedValue([
        token('user-android', 'pixel', 'android'),
      ]);

      await send(['user-android', 'user-web']);

      expect(
        mockDevicePushTokenService.incrementBadgeCount
      ).not.toHaveBeenCalled();
      expect(publishedFor('pixel').badge).toBeUndefined();
      const [, , webMessage] = mockAmqpConnection.publish.mock.calls[0];
      expect(webMessage.badge).toBeUndefined();
    });

    it('counts on the messaging entry point too', async () => {
      mockDevicePushTokenService.getTokensForUsers.mockResolvedValue([
        token('user-1', 'phone', 'ios'),
      ]);

      await adapter.sendMessagingPushNotifications(
        [createUser('user-1')],
        NotificationEvent.USER_CONVERSATION_MESSAGE_DIRECT,
        { title: 'Alice', body: 'sent you 1 message', url: '/?chat=1' }
      );

      expect(
        mockDevicePushTokenService.incrementBadgeCount
      ).toHaveBeenCalledWith('user-1');
      expect(publishedFor('phone').badge).toBe(3);
    });

    it('counts only iOS holders in a mixed dispatch', async () => {
      mockDevicePushTokenService.getTokensForUsers.mockResolvedValue([
        token('user-ios', 'iphone', 'ios'),
        token('user-android', 'pixel', 'android'),
        token('user-both', 'both-ios', 'ios'),
        token('user-both', 'both-android', 'android'),
      ]);

      await send(['user-ios', 'user-android', 'user-both']);

      const counted =
        mockDevicePushTokenService.incrementBadgeCount.mock.calls.map(
          ([userId]) => userId
        );
      expect(counted.sort()).toEqual(['user-both', 'user-ios']);
      expect(publishedFor('pixel').badge).toBeUndefined();
    });

    it('still publishes without a badge when the counter fails', async () => {
      mockDevicePushTokenService.getTokensForUsers.mockResolvedValue([
        token('user-1', 'phone', 'ios'),
      ]);
      mockDevicePushTokenService.incrementBadgeCount.mockRejectedValue(
        new Error('redis down')
      );
      const logger = (adapter as any).logger;
      const errorSpy = vi.spyOn(logger, 'error');

      await send(['user-1']);

      expect(mockAmqpConnection.publish).toHaveBeenCalledTimes(1);
      expect(publishedFor('phone').badge).toBeUndefined();
      expect(errorSpy).toHaveBeenCalledTimes(1);
      expect(errorSpy.mock.calls[0][0]).toMatchObject({
        userId: 'user-1',
        error: 'redis down',
      });
    });
  });

  describe('sendMessagingPushNotifications', () => {
    const activeSubscription = {
      id: 'sub-1',
      userId: 'user-1',
      endpoint: 'https://push.example.com/1',
      p256dh: 'key1',
      auth: 'auth1',
    };

    it('US4-AS2 / FR-012: never touches the shared push throttle', async () => {
      mockPushSubscriptionService.getActiveSubscriptions.mockResolvedValue([
        activeSubscription,
      ]);

      await adapter.sendMessagingPushNotifications(
        [createUser('user-1')],
        NotificationEvent.USER_CONVERSATION_MESSAGE_DIRECT,
        {
          title: 'Alice',
          body: 'sent you 2 messages',
          url: '/?chat=1',
          tag: 'messaging-digest-direct',
        }
      );

      // Independence by NON-PARTICIPATION (D-21): there is no messaging
      // budget any more, and the shared bucket is not consulted either. Chat
      // volume therefore cannot starve mentions/invitations, and the FR-011b
      // delay cap is what bounds messaging volume.
      expect(mockPushThrottleService.isAllowed).not.toHaveBeenCalled();
      expect(mockAmqpConnection.publish).toHaveBeenCalledTimes(1);
    });

    it('FR-024: forwards the stable collapse tag onto the queued payload', async () => {
      mockPushSubscriptionService.getActiveSubscriptions.mockResolvedValue([
        activeSubscription,
      ]);

      await adapter.sendMessagingPushNotifications(
        [createUser('user-1')],
        NotificationEvent.USER_CONVERSATION_MESSAGE_GROUP,
        {
          title: 'New messages',
          body: '5 messages in 2 conversations',
          url: '/?chat=all',
          tag: 'messaging-digest-group',
        }
      );

      const [, , message] = mockAmqpConnection.publish.mock.calls[0];
      expect(message.payload.tag).toBe('messaging-digest-group');
    });

    it('omits `tag` entirely for notification kinds that should stack', async () => {
      mockPushThrottleService.isAllowed.mockResolvedValue(true);
      mockPushSubscriptionService.getActiveSubscriptions.mockResolvedValue([
        activeSubscription,
      ]);

      await adapter.sendPushNotifications(
        [createUser('user-1')],
        NotificationEvent.USER_MENTIONED,
        { title: 'Test', body: 'Test body', url: '/test' }
      );

      const [, , message] = mockAmqpConnection.publish.mock.calls[0];
      expect(message.payload).not.toHaveProperty('tag');
    });

    it('skips when the recipient list is empty', async () => {
      await adapter.sendMessagingPushNotifications(
        [],
        NotificationEvent.USER_CONVERSATION_MESSAGE_DIRECT,
        { title: 'Alice', body: 'sent you 1 message', url: '/?chat=1' }
      );

      expect(
        mockPushSubscriptionService.getActiveSubscriptions
      ).not.toHaveBeenCalled();
    });
  });
});
