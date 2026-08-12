import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { MESSAGING_REDIS_CLIENT } from '@services/infrastructure/redis-client/messaging-redis.provider';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PushThrottleService } from './push.throttle.service';

const mockRedis = {
  eval: vi.fn(),
};

// The service issues INCR + conditional EXPIRE as one Lua script; every
// assertion below therefore inspects the single `eval` round trip.
const evalKeys = () => mockRedis.eval.mock.calls.map(call => call[2]);

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
    it('increments the per-user, per-minute counter in a single round trip', async () => {
      mockRedis.eval.mockResolvedValue(6);

      const result = await service.isAllowed('user-1');

      expect(result).toBe(true);
      expect(mockRedis.eval).toHaveBeenCalledTimes(1);
      expect(mockRedis.eval).toHaveBeenCalledWith(
        expect.stringContaining('INCR'),
        1,
        expect.stringMatching(/^push:throttle:user-1:\d+$/),
        '60'
      );
    });

    it('sets the 60s TTL (seconds, not ms) atomically with the increment', async () => {
      mockRedis.eval.mockResolvedValue(1);

      const result = await service.isAllowed('user-1');

      expect(result).toBe(true);
      // TTL-on-create lives INSIDE the script — there is no window in which
      // the key can exist without an expiry.
      const [script, numKeys, , ttl] = mockRedis.eval.mock.calls[0];
      expect(script).toContain("redis.call('EXPIRE', KEYS[1], ARGV[1])");
      expect(script).toContain('if c == 1 then');
      expect(numKeys).toBe(1);
      expect(ttl).toBe('60');
    });

    it('should return false once the counter exceeds max', async () => {
      mockRedis.eval.mockResolvedValue(11);

      const result = await service.isAllowed('user-1');

      expect(result).toBe(false);
    });

    it('should return true at exactly the cap (cap is inclusive)', async () => {
      mockRedis.eval.mockResolvedValue(10);

      const result = await service.isAllowed('user-1');

      expect(result).toBe(true);
    });

    it('never lets N parallel calls exceed the cap (atomic INCR, no lost updates)', async () => {
      // Simulate what a real atomic INCR would return for 15 concurrent
      // callers sharing one counter: a strictly increasing, non-repeating
      // sequence — the property the old get-then-set implementation could
      // not guarantee.
      let counter = 0;
      mockRedis.eval.mockImplementation(async () => ++counter);

      const results = await Promise.all(
        Array.from({ length: 15 }, () => service.isAllowed('user-1'))
      );

      const allowedCount = results.filter(Boolean).length;
      expect(allowedCount).toBe(10);
    });

    it('fails OPEN (allowed) and logs when the store errors', async () => {
      mockRedis.eval.mockRejectedValue(new Error('ECONNREFUSED'));

      const result = await service.isAllowed('user-1');

      expect(result).toBe(true);
    });

    it('D-7 second fix: the key is epoch-minute-suffixed, so a key without a TTL still self-heals', async () => {
      // The original key was `push:throttle:{userId}` with no time component,
      // so a counter left without a TTL throttled that user PERMANENTLY. With
      // the window addressable by time, such a key belongs to a minute that is
      // never written to again.
      mockRedis.eval.mockResolvedValue(1);
      const expectedMinute = Math.floor(Date.now() / 60000);

      await service.isAllowed('user-abc-123');

      expect(evalKeys()).toEqual([
        `push:throttle:user-abc-123:${expectedMinute}`,
      ]);
    });

    it('rolls onto a fresh key when the epoch minute advances', async () => {
      mockRedis.eval.mockResolvedValue(1);
      const nowSpy = vi.spyOn(Date, 'now');

      nowSpy.mockReturnValue(60_000 * 100);
      await service.isAllowed('user-1');
      nowSpy.mockReturnValue(60_000 * 101);
      await service.isAllowed('user-1');

      expect(evalKeys()).toEqual([
        'push:throttle:user-1:100',
        'push:throttle:user-1:101',
      ]);
      nowSpy.mockRestore();
    });

    it('FR-012: messaging notifications never reach this bucket at all', async () => {
      // Independence by NON-PARTICIPATION (D-21). This service is now used
      // only by `sendPushNotifications`; the messaging digest path calls
      // `sendMessagingPushNotifications`, which does not consult it. Asserted
      // from the other side in notification.push.adapter.spec.ts.
      mockRedis.eval.mockResolvedValue(1);

      await service.isAllowed('user-1');

      for (const key of evalKeys()) {
        expect(key).toMatch(/^push:throttle:/);
        expect(key).not.toMatch(/^msg:notif:/);
      }
    });
  });
});
