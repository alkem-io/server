import { PushSubscription } from '@domain/push-subscription/push.subscription.entity';
import { PushSubscriptionStatus } from '@domain/push-subscription/push.subscription.interface';
import { PushSubscriptionService } from '@domain/push-subscription/push.subscription.service';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { repositoryMockFactory } from '@test/utils/repository.mock.factory';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockConfigService = {
  get: vi.fn((key: string) => {
    const config: Record<string, unknown> = {
      'notifications.push.max_subscriptions_per_user': 10,
      'notifications.push.cleanup.stale_days': 30,
    };
    return config[key];
  }),
};

describe('PushSubscriptionService', () => {
  let service: PushSubscriptionService;
  let repository: ReturnType<typeof repositoryMockFactory>;

  beforeEach(async () => {
    repository = repositoryMockFactory();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PushSubscriptionService,
        {
          provide: getRepositoryToken(PushSubscription),
          useValue: repository,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        MockWinstonProvider,
      ],
    }).compile();

    service = module.get<PushSubscriptionService>(PushSubscriptionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('subscribe', () => {
    it('should create a new subscription', async () => {
      const input = {
        endpoint: 'https://push.example.com/send/abc',
        p256dh: 'test-p256dh-key',
        auth: 'test-auth-key',
        userAgent: 'Mozilla/5.0',
      };
      const userId = 'user-123';

      repository.findOne!.mockResolvedValue(null);
      repository.find!.mockResolvedValue([]);
      repository.create!.mockReturnValue({
        ...input,
        id: 'sub-1',
        status: PushSubscriptionStatus.ACTIVE,
        userId,
      });
      repository.save!.mockResolvedValue({
        ...input,
        id: 'sub-1',
        status: PushSubscriptionStatus.ACTIVE,
        userId,
      });

      const result = await service.subscribe(userId, input);

      expect(result.id).toBe('sub-1');
      expect(result.status).toBe(PushSubscriptionStatus.ACTIVE);
      expect(repository.create).toHaveBeenCalledWith({
        endpoint: input.endpoint,
        p256dh: input.p256dh,
        auth: input.auth,
        status: PushSubscriptionStatus.ACTIVE,
        userAgent: input.userAgent,
        userId,
      });
    });

    it('should upsert when endpoint already exists', async () => {
      const existingSub = {
        id: 'sub-existing',
        endpoint: 'https://push.example.com/send/abc',
        p256dh: 'old-key',
        auth: 'old-auth',
        status: PushSubscriptionStatus.EXPIRED,
        userId: 'user-123',
      };

      repository.findOne!.mockResolvedValue(existingSub);
      repository.save!.mockResolvedValue({
        ...existingSub,
        p256dh: 'new-key',
        auth: 'new-auth',
        status: PushSubscriptionStatus.ACTIVE,
      });

      const result = await service.subscribe('user-123', {
        endpoint: 'https://push.example.com/send/abc',
        p256dh: 'new-key',
        auth: 'new-auth',
      });

      expect(result.status).toBe(PushSubscriptionStatus.ACTIVE);
      expect(result.p256dh).toBe('new-key');
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('should preserve DISABLED status when re-subscribing with same endpoint', async () => {
      const existingSub = {
        id: 'sub-disabled',
        endpoint: 'https://push.example.com/send/abc',
        p256dh: 'old-key',
        auth: 'old-auth',
        status: PushSubscriptionStatus.DISABLED,
        userId: 'user-123',
      };

      repository.findOne!.mockResolvedValue(existingSub);
      repository.save!.mockImplementation(async (entity: any) => entity);

      const result = await service.subscribe('user-123', {
        endpoint: 'https://push.example.com/send/abc',
        p256dh: 'new-key',
        auth: 'new-auth',
      });

      expect(result.status).toBe(PushSubscriptionStatus.DISABLED);
      expect(result.p256dh).toBe('new-key');
      expect(result.auth).toBe('new-auth');
    });

    it('should enforce cap by removing oldest when over max subscriptions', async () => {
      const userId = 'user-123';
      const existingSubscriptions = Array.from({ length: 10 }, (_, i) => ({
        id: `sub-${i}`,
        userId,
        status: PushSubscriptionStatus.ACTIVE,
        createdDate: new Date(2026, 0, i + 1),
      }));

      repository.findOne!.mockResolvedValue(null); // no existing endpoint
      repository.find!.mockResolvedValue(existingSubscriptions); // active subs at cap
      repository.remove!.mockResolvedValue(undefined);
      repository.create!.mockReturnValue({
        id: 'sub-new',
        status: PushSubscriptionStatus.ACTIVE,
        userId,
      });
      repository.save!.mockResolvedValue({
        id: 'sub-new',
        status: PushSubscriptionStatus.ACTIVE,
        userId,
      });

      await service.subscribe(userId, {
        endpoint: 'https://push.example.com/new',
        p256dh: 'key',
        auth: 'auth',
      });

      // Should have removed the oldest subscription
      expect(repository.remove).toHaveBeenCalledWith([
        existingSubscriptions[0],
      ]);
    });
  });

  describe('unsubscribe', () => {
    it('should mark subscription as DISABLED', async () => {
      const subscription = {
        id: 'sub-1',
        userId: 'user-123',
        status: PushSubscriptionStatus.ACTIVE,
      };

      repository.findOne!.mockResolvedValue(subscription);
      repository.save!.mockImplementation(async (entity: any) => entity);

      const result = await service.unsubscribe('sub-1', 'user-123');

      expect(result.id).toBe('sub-1');
      expect(result.status).toBe(PushSubscriptionStatus.DISABLED);
      expect(repository.save).toHaveBeenCalledWith(subscription);
    });

    it('should throw when subscription not found', async () => {
      repository.findOne!.mockResolvedValue(null);

      await expect(
        service.unsubscribe('sub-nonexistent', 'user-123')
      ).rejects.toThrow('Push subscription not found');
    });
  });

  describe('enableSubscription', () => {
    it('should set subscription status to ACTIVE', async () => {
      const subscription = {
        id: 'sub-1',
        userId: 'user-123',
        status: PushSubscriptionStatus.DISABLED,
      };

      repository.findOne!.mockResolvedValue(subscription);
      repository.save!.mockImplementation(async (entity: any) => entity);

      const result = await service.enableSubscription('sub-1', 'user-123');

      expect(result.status).toBe(PushSubscriptionStatus.ACTIVE);
      expect(repository.save).toHaveBeenCalledWith(subscription);
    });

    it('should throw when subscription not found', async () => {
      repository.findOne!.mockResolvedValue(null);

      await expect(
        service.enableSubscription('sub-nonexistent', 'user-123')
      ).rejects.toThrow('Push subscription not found');
    });
  });

  describe('getActiveSubscriptions', () => {
    it('should return only active subscriptions for given user ids', async () => {
      const subs = [
        {
          id: 'sub-1',
          userId: 'user-1',
          status: PushSubscriptionStatus.ACTIVE,
        },
        {
          id: 'sub-2',
          userId: 'user-2',
          status: PushSubscriptionStatus.ACTIVE,
        },
      ];
      repository.find!.mockResolvedValue(subs);

      const result = await service.getActiveSubscriptions(['user-1', 'user-2']);

      expect(result).toHaveLength(2);
      expect(repository.find).toHaveBeenCalled();
    });

    it('should return empty array for empty user ids', async () => {
      const result = await service.getActiveSubscriptions([]);
      expect(result).toEqual([]);
      expect(repository.find).not.toHaveBeenCalled();
    });
  });

  describe('markExpired', () => {
    it('should set subscription status to expired', async () => {
      repository.update!.mockResolvedValue({ affected: 1 });

      await service.markExpired('sub-1');

      expect(repository.update).toHaveBeenCalledWith('sub-1', {
        status: PushSubscriptionStatus.EXPIRED,
      });
    });
  });

  describe('cleanupStale', () => {
    it('should remove stale and expired subscriptions', async () => {
      repository.delete!.mockResolvedValueOnce({ affected: 3 }); // stale active
      repository.delete!.mockResolvedValueOnce({ affected: 2 }); // expired

      const result = await service.cleanupStale(30);

      expect(result).toBe(5);
      expect(repository.delete).toHaveBeenCalledTimes(2);
    });
  });
});
