import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { MESSAGING_REDIS_CLIENT } from '@services/infrastructure/redis-client/messaging-redis.provider';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ConversationDigestSchedulerService,
  DIGEST_ARM_LUA,
  DIGEST_RE_ARM_LUA,
} from './conversation.digest.scheduler.service';
import {
  DIGEST_DUE_KEY,
  digestAttemptsKey,
  digestFirstKey,
  digestPendingKey,
} from './conversation.digest.track';

const DIGEST_CONFIG = {
  sweep_interval_seconds: 10,
  max_dispatch_attempts: 3,
  retry_backoff_seconds: 60,
  push: {
    direct: { quiet_period_seconds: 60, max_delay_seconds: 300 },
    group: { quiet_period_seconds: 300, max_delay_seconds: 900 },
  },
  email: {
    direct: { quiet_period_seconds: 300, max_delay_seconds: 1800 },
    group: { quiet_period_seconds: 1200, max_delay_seconds: 3600 },
  },
};

/**
 * A minimal in-memory stand-in for the subset of Redis this service uses.
 *
 * The three Lua scripts are hand-ported to JS below. That port is only
 * trustworthy while it matches the Lua, so the tests in
 * `describe('the Lua source')` assert the load-bearing constructs directly on
 * the script text — the pairing of the two is what makes the behavioural
 * tests meaningful.
 */
class FakeRedis {
  strings = new Map<string, string>();
  sets = new Map<string, Set<string>>();
  zset = new Map<string, number>();
  ttls = new Map<string, number>();
  private commands = new Map<string, string>();

  defineCommand(name: string, definition: { lua: string }): void {
    this.commands.set(name, definition.lua);
  }

  luaFor(name: string): string | undefined {
    return this.commands.get(name);
  }

  // --- arm (port of DIGEST_ARM_LUA) ---
  msgDigestArm = vi.fn(
    async (
      dueKey: string,
      pendingKey: string,
      firstKey: string,
      track: string,
      conversationId: string,
      nowMs: number,
      quietMs: number,
      maxDelayMs: number,
      ttlSec: number
    ) => {
      let first = this.strings.get(firstKey);
      if (first === undefined) {
        first = String(nowMs);
        this.strings.set(firstKey, first);
        this.ttls.set(firstKey, ttlSec);
      }
      const fireAt = Math.min(
        Number(nowMs) + Number(quietMs),
        Number(first) + Number(maxDelayMs)
      );
      // No NX, no GT — the overwrite IS the debounce reset.
      this.zset.set(track, fireAt);
      const pending = this.sets.get(pendingKey) ?? new Set<string>();
      pending.add(conversationId);
      this.sets.set(pendingKey, pending);
      this.ttls.set(pendingKey, ttlSec);
      void dueKey;
      return fireAt;
    }
  );

  // --- readAndClear (port of DIGEST_READ_AND_CLEAR_LUA) ---
  msgDigestReadAndClear = vi.fn(
    async (pendingKey: string, firstKey: string) => {
      const ids = [...(this.sets.get(pendingKey) ?? [])];
      const first = this.strings.get(firstKey) ?? '';
      this.sets.delete(pendingKey);
      this.strings.delete(firstKey);
      return [ids, first] as [string[], string];
    }
  );

  // --- reArm (port of DIGEST_RE_ARM_LUA) ---
  msgDigestReArm = vi.fn(
    async (
      _dueKey: string,
      pendingKey: string,
      firstKey: string,
      attemptsKey: string,
      track: string,
      fireAtMs: number,
      firstAtMs: number,
      ttlSec: number,
      maxAttempts: number,
      ...conversationIds: string[]
    ) => {
      const attempts = Number(this.strings.get(attemptsKey) ?? 0) + 1;
      this.strings.set(attemptsKey, String(attempts));
      this.ttls.set(attemptsKey, ttlSec);
      if (attempts > Number(maxAttempts)) {
        this.strings.delete(attemptsKey);
        return 0;
      }
      const pending = this.sets.get(pendingKey) ?? new Set<string>();
      for (const id of conversationIds) pending.add(String(id));
      this.sets.set(pendingKey, pending);
      this.strings.set(firstKey, String(firstAtMs));
      this.zset.set(track, Number(fireAtMs));
      return attempts;
    }
  );

  async zrangebyscore(
    _key: string,
    _min: string,
    max: number,
    _limitToken: string,
    offset: number,
    count: number
  ): Promise<string[]> {
    return [...this.zset.entries()]
      .filter(([, score]) => score <= Number(max))
      .sort((a, b) => a[1] - b[1])
      .map(([member]) => member)
      .slice(offset, offset + count);
  }

  async zrem(_key: string, member: string): Promise<number> {
    return this.zset.delete(member) ? 1 : 0;
  }

  async del(key: string): Promise<number> {
    return this.strings.delete(key) ? 1 : 0;
  }
}

describe('ConversationDigestSchedulerService', () => {
  let service: ConversationDigestSchedulerService;
  let redis: FakeRedis;

  const track = {
    channel: 'push' as const,
    kind: 'direct' as const,
    userId: 'user-1',
  };
  const trackKey = 'push:direct:user-1';

  const build = async (
    configOverride: any = DIGEST_CONFIG,
    store: FakeRedis = new FakeRedis()
  ) => {
    redis = store;
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConversationDigestSchedulerService,
        { provide: MESSAGING_REDIS_CLIENT, useValue: store },
        {
          provide: ConfigService,
          useValue: { get: vi.fn().mockReturnValue(configOverride) },
        },
        MockWinstonProvider,
      ],
    }).compile();
    return module.get(ConversationDigestSchedulerService);
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    service = await build();
  });

  describe('boot-time validation (data-model §6)', () => {
    it('fails fast rather than producing tracks that silently never fire', async () => {
      await expect(
        build({ ...DIGEST_CONFIG, sweep_interval_seconds: 999 })
      ).rejects.toThrow(/sweep_interval_seconds/);
    });
  });

  describe('the Lua source (the port in FakeRedis is only valid while these hold)', () => {
    it('ZADD carries no NX/GT flag — the score OVERWRITE is the debounce reset', () => {
      const zadd = DIGEST_ARM_LUA.match(/ZADD[^)]*\)/)?.[0] ?? '';
      expect(zadd).toContain('ZADD');
      expect(zadd).not.toContain('NX');
      expect(zadd).not.toContain('GT');
      expect(zadd).not.toContain('XX');
    });

    it('the first-seen anchor is written only when absent — that is the FR-011b cap anchor', () => {
      expect(DIGEST_ARM_LUA).toMatch(/if not first then/);
      expect(DIGEST_ARM_LUA).toMatch(/math\.min\(/);
    });

    it('the re-arm increments the attempt counter BEFORE deciding, so the budget cannot be bypassed', () => {
      const incrIndex = DIGEST_RE_ARM_LUA.indexOf("INCR', KEYS[4]");
      const decisionIndex = DIGEST_RE_ARM_LUA.indexOf('if attempts >');
      expect(incrIndex).toBeGreaterThanOrEqual(0);
      expect(decisionIndex).toBeGreaterThan(incrIndex);
    });
  });

  describe('arm (§5.1)', () => {
    it('passes the track keys, the per-track windows in MILLISECONDS, and the state TTL in SECONDS', async () => {
      await service.arm(track, 'conv-1', 1_000_000);

      expect(redis.msgDigestArm).toHaveBeenCalledWith(
        DIGEST_DUE_KEY,
        digestPendingKey(trackKey),
        digestFirstKey(trackKey),
        trackKey,
        'conv-1',
        1_000_000,
        60_000, // 60s quiet period, in ms for the Lua arithmetic
        300_000, // 300s cap, in ms
        600 // max_delay + 300s headroom, in seconds for EXPIRE
      );
    });

    it('uses the windows of the track being armed, not a global default', async () => {
      await service.arm(
        { channel: 'email', kind: 'group', userId: 'user-1' },
        'conv-1',
        1_000_000
      );

      const call = redis.msgDigestArm.mock.calls[0];
      expect(call[6]).toBe(1_200_000); // email/group quiet = 1200s
      expect(call[7]).toBe(3_600_000); // email/group cap = 3600s
    });

    it('is idempotent per conversation — a repeat arm adds nothing to the pending set', async () => {
      await service.arm(track, 'conv-1', 1_000_000);
      await service.arm(track, 'conv-1', 1_010_000);

      expect([...redis.sets.get(digestPendingKey(trackKey))!]).toEqual([
        'conv-1',
      ]);
    });

    it('accumulates DISTINCT conversations for the same recipient into one digest (FR-011a)', async () => {
      await service.arm(track, 'conv-1', 1_000_000);
      await service.arm(track, 'conv-2', 1_005_000);

      expect([...redis.sets.get(digestPendingKey(trackKey))!].sort()).toEqual([
        'conv-1',
        'conv-2',
      ]);
    });

    it('a second arm RESETS the due score but NOT the first-seen anchor', async () => {
      await service.arm(track, 'conv-1', 1_000_000);
      const firstScore = redis.zset.get(trackKey);
      const anchor = redis.strings.get(digestFirstKey(trackKey));

      await service.arm(track, 'conv-2', 1_030_000);

      expect(redis.zset.get(trackKey)).toBe(firstScore! + 30_000);
      expect(redis.strings.get(digestFirstKey(trackKey))).toBe(anchor);
      expect(anchor).toBe('1000000');
    });

    it('clamps the fire time at the cap once the anchor is old enough (FR-011b)', async () => {
      await service.arm(track, 'conv-1', 1_000_000);
      // Keep arming every 10s well past the 300s cap.
      for (let t = 1_010_000; t <= 1_600_000; t += 10_000) {
        await service.arm(track, 'conv-1', t);
      }

      expect(redis.zset.get(trackKey)).toBe(1_000_000 + 300_000);
    });

    it('fails OPEN — an arm failure must not break message ingestion', async () => {
      redis.msgDigestArm.mockRejectedValueOnce(new Error('redis down'));

      await expect(
        service.arm(track, 'conv-1', 1_000_000)
      ).resolves.toBeUndefined();
    });
  });

  describe('claimDue (§5.2 / D-25)', () => {
    it('returns only tracks whose fire time has passed', async () => {
      redis.zset.set('push:direct:a', 900);
      redis.zset.set('push:direct:b', 1000);
      redis.zset.set('push:direct:c', 2000);

      expect(await service.claimDue(1000, 10)).toEqual([
        'push:direct:a',
        'push:direct:b',
      ]);
    });

    it('gives a member to EXACTLY ONE caller when two replicas sweep concurrently (D-25)', async () => {
      const shared = redis;
      shared.zset.set(trackKey, 500);
      // A second replica against the SAME store. Both see the due member;
      // only the one whose ZREM returns 1 owns the flush. No lock, no leader.
      const replicaTwo = await build(DIGEST_CONFIG, shared);

      const [claimedByOne, claimedByTwo] = await Promise.all([
        service.claimDue(1000, 10),
        replicaTwo.claimDue(1000, 10),
      ]);

      expect(claimedByOne.length + claimedByTwo.length).toBe(1);
    });

    it('a lost ZREM race yields no claim and no flush', async () => {
      redis.zset.set(trackKey, 500);
      vi.spyOn(redis, 'zrem').mockResolvedValue(0);

      expect(await service.claimDue(1000, 10)).toEqual([]);
    });

    it('honours the batch limit so one tick cannot run unbounded', async () => {
      for (let i = 0; i < 50; i++) {
        redis.zset.set(`push:direct:user-${i}`, 100);
      }

      expect(await service.claimDue(1000, 10)).toHaveLength(10);
    });

    it('fails OPEN on a due-queue read error — the tick is skipped, not killed', async () => {
      vi.spyOn(redis, 'zrangebyscore').mockRejectedValue(new Error('down'));

      expect(await service.claimDue(1000, 10)).toEqual([]);
    });
  });

  describe('readAndClear (§5.3)', () => {
    it('drains the pending conversations and the anchor together', async () => {
      await service.arm(track, 'conv-1', 1_000_000);
      await service.arm(track, 'conv-2', 1_000_000);

      const state = await service.readAndClear(trackKey);

      expect(state.conversationIds.sort()).toEqual(['conv-1', 'conv-2']);
      expect(state.firstAtMs).toBe(1_000_000);
      expect(redis.sets.get(digestPendingKey(trackKey))).toBeUndefined();
      expect(redis.strings.get(digestFirstKey(trackKey))).toBeUndefined();
    });

    it('reports an empty pending set rather than inventing one', async () => {
      const state = await service.readAndClear(trackKey);

      expect(state.conversationIds).toEqual([]);
      expect(state.firstAtMs).toBeNull();
    });

    it('fails CLOSED on a store error — nothing to flush beats dispatching a guess', async () => {
      redis.msgDigestReadAndClear.mockRejectedValueOnce(new Error('down'));

      expect(await service.readAndClear(trackKey)).toEqual({
        conversationIds: [],
        firstAtMs: null,
      });
    });
  });

  describe('reArm (§5.4)', () => {
    it('restores the pending conversations and the anchor at now + backoff', async () => {
      const reArmed = await service.reArm(
        track,
        trackKey,
        ['conv-1', 'conv-2'],
        900_000,
        1_000_000
      );

      expect(reArmed).toBe(true);
      expect(redis.zset.get(trackKey)).toBe(1_000_000 + 60_000);
      expect([...redis.sets.get(digestPendingKey(trackKey))!].sort()).toEqual([
        'conv-1',
        'conv-2',
      ]);
      expect(redis.strings.get(digestFirstKey(trackKey))).toBe('900000');
    });

    it('refuses to re-arm once the attempt budget is spent', async () => {
      for (let i = 0; i < 3; i++) {
        expect(
          await service.reArm(track, trackKey, ['conv-1'], 900_000, 1_000_000)
        ).toBe(true);
      }

      expect(
        await service.reArm(track, trackKey, ['conv-1'], 900_000, 1_000_000)
      ).toBe(false);
    });

    it('clearAttempts resets the budget so it applies per digest, not per lifetime', async () => {
      for (let i = 0; i < 3; i++) {
        await service.reArm(track, trackKey, ['conv-1'], 900_000, 1_000_000);
      }
      await service.clearAttempts(trackKey);

      expect(
        await service.reArm(track, trackKey, ['conv-1'], 900_000, 1_000_000)
      ).toBe(true);
    });

    it('fails closed (no re-arm) on a store error', async () => {
      redis.msgDigestReArm.mockRejectedValueOnce(new Error('down'));

      expect(
        await service.reArm(track, trackKey, ['conv-1'], 900_000, 1_000_000)
      ).toBe(false);
    });
  });

  it('never writes to the shared push-throttle namespace (FR-012 independence)', async () => {
    await service.arm(track, 'conv-1', 1_000_000);
    await service.readAndClear(trackKey);
    await service.reArm(track, trackKey, ['conv-1'], 900_000, 1_000_000);

    const touched = [
      ...redis.strings.keys(),
      ...redis.sets.keys(),
      ...redis.zset.keys(),
      digestAttemptsKey(trackKey),
    ];
    expect(touched.some(key => key.startsWith('push:throttle:'))).toBe(false);
  });
});
