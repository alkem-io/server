import { PushSubscriptionService } from '@domain/push-subscription/push.subscription.service';

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PushDeliveryService } from './push.delivery.service';
import { PushNotificationMessage } from './push.notification.message';
import webpush from 'web-push';

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

    it('should abandon and ack when retry count exceeds max', async () => {
      const message = createMessage({ retryCount: 5 });

      const result = await service.handlePushMessage(message);

      expect(result).toBeUndefined(); // ack
      expect(sendNotificationSpy).not.toHaveBeenCalled();
    });
  });
});
