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
      expect(mockRedis.incr).toHaveBeenCalledWith(
        expect.stringMatching(/^push:throttle:user-1:\d+$/)
      );
      expect(mockRedis.expire).not.toHaveBeenCalled();
    });

    it('should apply a 60s TTL (seconds, not ms) on the first increment', async () => {
      mockRedis.incr.mockResolvedValue(1);

      const result = await service.isAllowed('user-1');

      expect(result).toBe(true);
      expect(mockRedis.expire).toHaveBeenCalledWith(
        expect.stringMatching(/^push:throttle:user-1:\d+$/),
        60
      );
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

    it('D-7 second fix: the key is epoch-minute-suffixed, so a lost EXPIRE self-heals', async () => {
      // The original key was `push:throttle:{userId}` with no time component.
      // INCR and EXPIRE are two commands; if the process died between them the
      // counter was left with NO TTL and that user was throttled PERMANENTLY.
      // With the window addressable by time, a stranded key belongs to a
      // minute that is never written to again.
      mockRedis.incr.mockResolvedValue(1);
      const expectedMinute = Math.floor(Date.now() / 60000);

      await service.isAllowed('user-abc-123');

      expect(mockRedis.incr).toHaveBeenCalledWith(
        `push:throttle:user-abc-123:${expectedMinute}`
      );
    });

    it('rolls onto a fresh key when the epoch minute advances', async () => {
      mockRedis.incr.mockResolvedValue(1);
      const nowSpy = vi.spyOn(Date, 'now');

      nowSpy.mockReturnValue(60_000 * 100);
      await service.isAllowed('user-1');
      nowSpy.mockReturnValue(60_000 * 101);
      await service.isAllowed('user-1');

      expect(mockRedis.incr).toHaveBeenNthCalledWith(
        1,
        'push:throttle:user-1:100'
      );
      expect(mockRedis.incr).toHaveBeenNthCalledWith(
        2,
        'push:throttle:user-1:101'
      );
      nowSpy.mockRestore();
    });

    it('FR-012: messaging notifications never reach this bucket at all', async () => {
      // Independence by NON-PARTICIPATION (D-21). This service is now used
      // only by `sendPushNotifications`; the messaging digest path calls
      // `sendMessagingPushNotifications`, which does not consult it. Asserted
      // from the other side in notification.push.adapter.spec.ts.
      mockRedis.incr.mockResolvedValue(1);

      await service.isAllowed('user-1');

      for (const [key] of mockRedis.incr.mock.calls) {
        expect(key).toMatch(/^push:throttle:/);
        expect(key).not.toMatch(/^msg:notif:/);
      }
    });
  });
});
