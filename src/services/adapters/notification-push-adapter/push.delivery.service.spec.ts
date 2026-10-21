import { PushSubscriptionService } from '@domain/push-subscription/push.subscription.service';

import { beforeEach, describe, expect, it, vi } from 'vitest';
import webpush from 'web-push';
import { NativePushSenderService } from './native.push.sender.service';
import { PushDeliveryService } from './push.delivery.service';
import {
  NativePushNotificationMessage,
  PushNotificationMessage,
} from './push.notification.message';

const mockLogger = {
  verbose: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  log: vi.fn(),
};

const mockPushSubscriptionService = {
  markActive: vi.fn(),
  markExpired: vi.fn(),
};

const mockNativeSender = {
  send: vi.fn(),
};

const mockConfigService = {
  get: vi.fn((key: string) => {
    const config: Record<string, unknown> = {
      'notifications.push.retry.max_attempts': 5,
      'notifications.push.vapid.public_key': '',
      'notifications.push.vapid.private_key': '',
      'notifications.push.vapid.subject': 'mailto:test@example.com',
    };
    return config[key];
  }),
};

const createMessage = (
  overrides?: Partial<PushNotificationMessage>
): PushNotificationMessage => ({
  subscriptionId: 'sub-1',
  userId: 'user-1',
  endpoint: 'https://push.example.com/send/abc',
  keys: { p256dh: 'test-key', auth: 'test-auth' },
  payload: {
    title: 'Test',
    body: 'Test body',
    url: '/test',
    eventType: 'TEST_EVENT',
    timestamp: new Date().toISOString(),
  },
  retryCount: 0,
  ...overrides,
});

const createNativeMessage = (): NativePushNotificationMessage => ({
  userId: 'user-1',
  platform: 'ios',
  token: 'device-token-1',
  payload: {
    title: 'Test',
    body: 'Test body',
    url: '/test',
    eventType: 'TEST_EVENT',
    timestamp: new Date().toISOString(),
  },
});

describe('PushDeliveryService', () => {
  let service: PushDeliveryService;
  let sendNotificationSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();

    // Spy on webpush.sendNotification so we can control its behavior
    sendNotificationSpy = vi
      .spyOn(webpush, 'sendNotification')
      .mockResolvedValue({} as any);

    // Construct the service directly with mock dependencies
    service = new PushDeliveryService(
      mockPushSubscriptionService as unknown as PushSubscriptionService,
      mockConfigService as any,
      mockNativeSender as unknown as NativePushSenderService,
      mockLogger as any
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('handlePushMessage', () => {
    it('should deliver notification successfully and mark active', async () => {
      sendNotificationSpy.mockResolvedValue({} as any);
      const message = createMessage();

      const result = await service.handlePushMessage(message);

      expect(result).toBeUndefined(); // void = ack
      expect(sendNotificationSpy).toHaveBeenCalled();
      expect(mockPushSubscriptionService.markActive).toHaveBeenCalledWith(
        'sub-1'
      );
    });

    it('should mark expired on 410 Gone and ack', async () => {
      const error = new Error('Gone') as any;
      error.statusCode = 410;
      sendNotificationSpy.mockRejectedValue(error);

      const message = createMessage();
      const result = await service.handlePushMessage(message);

      expect(result).toBeUndefined(); // ack
      expect(mockPushSubscriptionService.markExpired).toHaveBeenCalledWith(
        'sub-1'
      );
    });

    it('should ack and drop on transient error to prevent redelivery loop', async () => {
      sendNotificationSpy.mockRejectedValue(new Error('Network error'));

      const message = createMessage({ retryCount: 2 });
      const result = await service.handlePushMessage(message);

      expect(result).toBeUndefined(); // ack - drop to prevent tight loop
    });

    it('should mark expired on 4xx client errors', async () => {
      const error = new Error('Not Found') as any;
      error.statusCode = 404;
      sendNotificationSpy.mockRejectedValue(error);

      const message = createMessage();
      const result = await service.handlePushMessage(message);

      expect(result).toBeUndefined();
      expect(mockPushSubscriptionService.markExpired).toHaveBeenCalledWith(
        'sub-1'
      );
    });

    // SC-006. A 429 is transient: expiring the subscription on it is defect
    // X-4, and `cleanupStale` then deletes the row permanently. The existing
    // 404 case above pins the narrowing from the other side.
    it('should NOT mark expired on a 429 (SC-006)', async () => {
      const error = new Error('Too Many Requests') as any;
      error.statusCode = 429;
      sendNotificationSpy.mockRejectedValue(error);

      const result = await service.handlePushMessage(createMessage());

      expect(result).toBeUndefined();
      expect(mockPushSubscriptionService.markExpired).not.toHaveBeenCalled();
    });

    // SC-014.
    it('should route a message carrying `platform` to the native sender only', async () => {
      mockNativeSender.send.mockResolvedValue(undefined);
      const message = createNativeMessage();

      const result = await service.handlePushMessage(message);

      expect(result).toBeUndefined();
      expect(mockNativeSender.send).toHaveBeenCalledWith(message);
      expect(sendNotificationSpy).not.toHaveBeenCalled();
    });

    // SC-014. The branch sits OUTSIDE the web `try`, whose catch is written
    // around `message.subscriptionId` — inside it, a rejecting native send
    // would call markExpired(undefined) against the live web-push table. And
    // the handler must still ACK: an escaping throw is nacked with
    // requeue = true and hot-loops the shared queue forever.
    it('should swallow a native send failure without touching any web subscription', async () => {
      // A statusCode-carrying error is the discriminating shape: evaluated by
      // the WEB catch it would call markExpired(undefined) — a TypeORM update
      // with an undefined id against the live web-push table.
      const error = new Error('bad .p8') as any;
      error.statusCode = 404;
      mockNativeSender.send.mockRejectedValue(error);

      await expect(
        service.handlePushMessage(createNativeMessage())
      ).resolves.toBeUndefined();

      expect(mockPushSubscriptionService.markExpired).not.toHaveBeenCalled();
      expect(mockPushSubscriptionService.markActive).not.toHaveBeenCalled();
    });

    it('should abandon and ack when retry count exceeds max', async () => {
      const message = createMessage({ retryCount: 5 });

      const result = await service.handlePushMessage(message);

      expect(result).toBeUndefined(); // ack
      expect(sendNotificationSpy).not.toHaveBeenCalled();
    });
  });
});
