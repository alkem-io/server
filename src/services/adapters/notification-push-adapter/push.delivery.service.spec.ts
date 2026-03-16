import { PushSubscriptionService } from '@domain/push-subscription/push.subscription.service';
import { Nack } from '@golevelup/nestjs-rabbitmq';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PushDeliveryService } from './push.delivery.service';
import { PushNotificationMessage } from './push.notification.message';

// Mock web-push module
vi.mock('web-push', () => ({
  setVapidDetails: vi.fn(),
  sendNotification: vi.fn(),
}));

import * as webpush from 'web-push';

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

const mockPushSubscriptionService = {
  markActive: vi.fn(),
  markExpired: vi.fn(),
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

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PushDeliveryService,
        {
          provide: PushSubscriptionService,
          useValue: mockPushSubscriptionService,
        },
        { provide: ConfigService, useValue: mockConfigService },
        MockWinstonProvider,
      ],
    }).compile();

    service = module.get<PushDeliveryService>(PushDeliveryService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('handlePushMessage', () => {
    it('should deliver notification successfully and mark active', async () => {
      (webpush.sendNotification as any).mockResolvedValue({});
      const message = createMessage();

      const result = await service.handlePushMessage(message);

      expect(result).toBeUndefined(); // void = ack
      expect(webpush.sendNotification).toHaveBeenCalled();
      expect(mockPushSubscriptionService.markActive).toHaveBeenCalledWith(
        'sub-1'
      );
    });

    it('should mark expired on 410 Gone and ack', async () => {
      const error = new Error('Gone') as any;
      error.statusCode = 410;
      (webpush.sendNotification as any).mockRejectedValue(error);

      const message = createMessage();
      const result = await service.handlePushMessage(message);

      expect(result).toBeUndefined(); // ack
      expect(mockPushSubscriptionService.markExpired).toHaveBeenCalledWith(
        'sub-1'
      );
    });

    it('should nack on transient error for DLX requeue', async () => {
      (webpush.sendNotification as any).mockRejectedValue(
        new Error('Network error')
      );

      const message = createMessage({ retryCount: 2 });
      const result = await service.handlePushMessage(message);

      expect(result).toBeInstanceOf(Nack);
    });

    it('should abandon and ack when retry count exceeds max', async () => {
      const message = createMessage({ retryCount: 5 });

      const result = await service.handlePushMessage(message);

      expect(result).toBeUndefined(); // ack
      expect(webpush.sendNotification).not.toHaveBeenCalled();
    });
  });
});
