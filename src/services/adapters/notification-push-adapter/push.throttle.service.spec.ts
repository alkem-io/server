import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { MESSAGING_REDIS_CLIENT } from '@services/infrastructure/redis-client/messaging-redis.provider';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PushThrottleService } from './push.throttle.service';

const mockRedis = {
  incr: vi.fn(),
  expire: vi.fn(),
};

const mockConfigService = {
  get: vi.fn((key: string) => {
    if (key === 'notifications.push.throttle.max_per_minute') return 10;
    return undefined;
  }),
};

describe('PushThrottleService', () => {
  let service: PushThrottleService;

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PushThrottleService,
        { provide: MESSAGING_REDIS_CLIENT, useValue: mockRedis },
        { provide: ConfigService, useValue: mockConfigService },
        MockWinstonProvider,
      ],
    }).compile();

    service = module.get<PushThrottleService>(PushThrottleService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('isAllowed', () => {
    it('should return true and NOT re-apply the TTL when the counter is not new', async () => {
      mockRedis.incr.mockResolvedValue(6);

      const result = await service.isAllowed('user-1');

      expect(result).toBe(true);
      expect(mockRedis.incr).toHaveBeenCalledWith('push:throttle:user-1');
      expect(mockRedis.expire).not.toHaveBeenCalled();
    });

    it('should apply a 60s TTL (seconds, not ms) on the first increment', async () => {
      mockRedis.incr.mockResolvedValue(1);

      const result = await service.isAllowed('user-1');

      expect(result).toBe(true);
      expect(mockRedis.expire).toHaveBeenCalledWith('push:throttle:user-1', 60);
    });

    it('should return false once the counter exceeds max', async () => {
      mockRedis.incr.mockResolvedValue(11);

      const result = await service.isAllowed('user-1');

      expect(result).toBe(false);
    });

    it('should return true at exactly the cap (cap is inclusive)', async () => {
      mockRedis.incr.mockResolvedValue(10);

      const result = await service.isAllowed('user-1');

      expect(result).toBe(true);
    });

    it('never lets N parallel calls exceed the cap (atomic INCR, no lost updates)', async () => {
      // Simulate what a real atomic INCR would return for 15 concurrent
      // callers sharing one counter: a strictly increasing, non-repeating
      // sequence — the property the old get-then-set implementation could
      // not guarantee.
      let counter = 0;
      mockRedis.incr.mockImplementation(async () => ++counter);

      const results = await Promise.all(
        Array.from({ length: 15 }, () => service.isAllowed('user-1'))
      );

      const allowedCount = results.filter(Boolean).length;
      expect(allowedCount).toBe(10);
    });

    it('fails OPEN (allowed) and logs when the store errors', async () => {
      mockRedis.incr.mockRejectedValue(new Error('ECONNREFUSED'));

      const result = await service.isAllowed('user-1');

      expect(result).toBe(true);
    });

    it('should use correct key pattern for user', async () => {
      mockRedis.incr.mockResolvedValue(1);

      await service.isAllowed('user-abc-123');

      expect(mockRedis.incr).toHaveBeenCalledWith('push:throttle:user-abc-123');
    });
  });
});
