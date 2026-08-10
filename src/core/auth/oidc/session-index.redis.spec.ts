import {
  addSessionToSubIndex,
  clearSubRevoked,
  dropSubIndex,
  getSubRevokedAt,
  listSessionsForSub,
  markSubRevoked,
  removeSessionFromSubIndex,
  SUB_INDEX_KEY_PREFIX,
  SUB_REVOKED_KEY_PREFIX,
  subIndexKey,
  subRevokedKey,
} from './session-index.redis';

const SUB = 'a1b2c3d4-0000-0000-0000-000000000001';
const NOW_S = 1_800_000_000;

type Call = { cmd: string; args: unknown[] };

/**
 * Minimal in-memory stand-in for the narrow ioredis surface the index uses.
 * Deliberately hand-rolled rather than pulling in `ioredis-mock`: the surface is
 * five commands, and the tests below need to assert the exact command sequence,
 * which a black-box mock would hide.
 */
function makeFakeRedis(initial?: {
  members?: string[];
  ttl?: number;
  expireImpl?: () => Promise<number>;
}) {
  const calls: Call[] = [];
  const sets = new Map<string, Set<string>>();
  const strings = new Map<string, string>();
  if (initial?.members) sets.set(subIndexKey(SUB), new Set(initial.members));
  let ttl = initial?.ttl ?? -2;

  const redis = {
    sadd: vi.fn(async (key: string, member: string) => {
      calls.push({ cmd: 'sadd', args: [key, member] });
      const set = sets.get(key) ?? new Set<string>();
      const added = set.has(member) ? 0 : 1;
      set.add(member);
      sets.set(key, set);
      return added;
    }),
    srem: vi.fn(async (key: string, member: string) => {
      calls.push({ cmd: 'srem', args: [key, member] });
      const set = sets.get(key);
      if (!set) return 0;
      const removed = set.delete(member) ? 1 : 0;
      // Redis removes a set once its last member goes.
      if (set.size === 0) sets.delete(key);
      return removed;
    }),
    smembers: vi.fn(async (key: string) => {
      calls.push({ cmd: 'smembers', args: [key] });
      return [...(sets.get(key) ?? [])];
    }),
    ttl: vi.fn(async (key: string) => {
      calls.push({ cmd: 'ttl', args: [key] });
      return ttl;
    }),
    expire: vi.fn(async (key: string, seconds: number) => {
      calls.push({ cmd: 'expire', args: [key, seconds] });
      if (initial?.expireImpl) return initial.expireImpl();
      ttl = seconds;
      return 1;
    }),
    del: vi.fn(async (key: string) => {
      calls.push({ cmd: 'del', args: [key] });
      strings.delete(key);
      return sets.delete(key) ? 1 : 0;
    }),
    get: vi.fn(async (key: string) => {
      calls.push({ cmd: 'get', args: [key] });
      return strings.get(key) ?? null;
    }),
    /**
     * Interprets the two Lua scripts rather than recording them.
     *
     * The properties worth testing now live INSIDE the scripts — initialise a
     * missing TTL, extend only when the candidate is longer, never shorten,
     * later revocation timestamp wins. Asserting that `eval` was called would
     * prove none of them, so the fake reproduces the semantics and the specs
     * assert the resulting state.
     */
    eval: vi.fn(
      async (script: string, _n: number, key: string, ...args: any[]) => {
        calls.push({ cmd: 'eval', args: [key, ...args] });

        if (script.includes("redis.call('SADD'")) {
          const [member, candidateRaw] = args as [string, string];
          const set = sets.get(key) ?? new Set<string>();
          const added = set.has(member) ? 0 : 1;
          set.add(member);
          sets.set(key, set);
          const candidate = Math.max(1, Number(candidateRaw));
          if (ttl < 0 || candidate > ttl) ttl = candidate;
          return added;
        }

        if (script.includes("redis.call('GET', KEYS[1])")) {
          const [revokedAtRaw, ttlRaw] = args as [string, string];
          const candidate = Number(revokedAtRaw);
          const raw = strings.get(key);
          const existing = raw === undefined ? null : Number(raw);
          const nextTtl = Math.max(1, Number(ttlRaw));
          if (existing === null || candidate > existing) {
            strings.set(key, String(candidate));
            ttl = nextTtl;
          } else if (nextTtl > ttl) {
            ttl = nextTtl;
          }
          return 1;
        }

        throw new Error(`fake redis: unrecognised script\n${script}`);
      }
    ),
  };

  return { redis: redis as any, calls, sets, getTtl: () => ttl };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW_S * 1000);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('subIndexKey', () => {
  it('namespaces alongside the existing session keys', () => {
    expect(SUB_INDEX_KEY_PREFIX).toBe('alkemio:sub:');
    expect(subIndexKey(SUB)).toBe(`alkemio:sub:${SUB}`);
  });
});

describe('addSessionToSubIndex', () => {
  // Keyspace invariant I1. A SADD without an EXPIRE leaks the key forever:
  // Redis sets have no per-member expiry, so an index that is never revoked
  // would outlive every session it names.
  it('always pairs the SADD with an expiry, in ONE round trip (invariant I1)', async () => {
    const { redis, calls, sets, getTtl } = makeFakeRedis();

    await addSessionToSubIndex(redis, SUB, 'sid-1', NOW_S + 3600);

    // One command, not three. A client-side SADD/TTL/EXPIRE could die between
    // the first and the last and leave the key immortal — the exact leak this
    // invariant exists to prevent — and it runs on every authenticated request.
    expect(calls.map(c => c.cmd)).toEqual(['eval']);
    expect([...(sets.get(subIndexKey(SUB)) ?? [])]).toEqual(['sid-1']);
    expect(getTtl()).toBe(3600);
  });

  // Keyspace invariant I2. The single most damaging way to get this wrong:
  // a shortened TTL evicts a LIVE member's entry, the index under-reports, and
  // a later revocation silently misses a session while reporting success.
  it('never shortens the TTL when a later-expiring session joins (invariant I2)', async () => {
    // Existing key already expires in 2 hours; the joining session's own
    // ceiling is only 1 hour away.
    const { redis, getTtl } = makeFakeRedis({ members: ['sid-1'], ttl: 7200 });

    await addSessionToSubIndex(redis, SUB, 'sid-2', NOW_S + 3600);

    expect(getTtl()).toBe(7200);
  });

  it('extends the TTL when the joining session outlives the current expiry', async () => {
    const { redis, getTtl } = makeFakeRedis({ members: ['sid-1'], ttl: 3600 });

    await addSessionToSubIndex(redis, SUB, 'sid-2', NOW_S + 7200);

    expect(getTtl()).toBe(7200);
  });

  it.each([
    ['no key (-2)', -2],
    ['key without expiry (-1)', -1],
  ])('treats a %s TTL sentinel as "no TTL to preserve"', async (_label, t) => {
    const { redis, getTtl } = makeFakeRedis({ ttl: t });

    await addSessionToSubIndex(redis, SUB, 'sid-1', NOW_S + 600);

    expect(getTtl()).toBe(600);
  });

  // A computed TTL of 0 or less would be read by Redis as "delete now",
  // silently dropping a set we just wrote to.
  it('floors the TTL at 1 second for an already-expired ceiling', async () => {
    const { redis, getTtl } = makeFakeRedis();

    await addSessionToSubIndex(redis, SUB, 'sid-1', NOW_S - 500);

    expect(getTtl()).toBe(1);
  });

  it('floors the TTL at 1 second for a non-finite ceiling', async () => {
    const { redis, getTtl } = makeFakeRedis();

    await addSessionToSubIndex(redis, SUB, 'sid-1', Number.NaN);

    expect(getTtl()).toBe(1);
  });

  // FR-002a relies on this: the self-healing write runs on every authenticated
  // request and must not accumulate duplicates.
  it('is idempotent — re-adding the same sid leaves one member', async () => {
    const { redis, sets } = makeFakeRedis();

    await addSessionToSubIndex(redis, SUB, 'sid-1', NOW_S + 3600);
    await addSessionToSubIndex(redis, SUB, 'sid-1', NOW_S + 3600);

    expect([...(sets.get(subIndexKey(SUB)) ?? [])]).toEqual(['sid-1']);
  });

  it.each([
    ['empty sub', '', 'sid-1'],
    ['empty sid', SUB, ''],
  ])('is a no-op for an %s', async (_label, sub, sid) => {
    const { redis, calls } = makeFakeRedis();

    await addSessionToSubIndex(redis, sub, sid, NOW_S + 3600);

    expect(calls).toEqual([]);
  });
});

describe('removeSessionFromSubIndex', () => {
  it('removes only the named member', async () => {
    const { redis, sets } = makeFakeRedis({ members: ['sid-1', 'sid-2'] });

    await removeSessionFromSubIndex(redis, SUB, 'sid-1');

    expect([...(sets.get(subIndexKey(SUB)) ?? [])]).toEqual(['sid-2']);
  });

  // Invariant I6 — no explicit cleanup path is needed.
  it('lets Redis drop the set once its last member goes (invariant I6)', async () => {
    const { redis, sets } = makeFakeRedis({ members: ['sid-1'] });

    await removeSessionFromSubIndex(redis, SUB, 'sid-1');

    expect(sets.has(subIndexKey(SUB))).toBe(false);
  });

  it('is a no-op for an empty sub or sid', async () => {
    const { redis, calls } = makeFakeRedis({ members: ['sid-1'] });

    await removeSessionFromSubIndex(redis, '', 'sid-1');
    await removeSessionFromSubIndex(redis, SUB, '');

    expect(calls).toEqual([]);
  });
});

describe('listSessionsForSub', () => {
  it('returns the subject’s sids', async () => {
    const { redis } = makeFakeRedis({ members: ['sid-1', 'sid-2'] });

    await expect(listSessionsForSub(redis, SUB)).resolves.toEqual([
      'sid-1',
      'sid-2',
    ]);
  });

  // Invariant I6 — "no sessions" and "no key" are the same answer, so callers
  // need no existence check.
  it('returns [] for a missing key (invariant I6)', async () => {
    const { redis } = makeFakeRedis();

    await expect(listSessionsForSub(redis, SUB)).resolves.toEqual([]);
  });

  it('returns [] for an empty sub without touching Redis', async () => {
    const { redis, calls } = makeFakeRedis({ members: ['sid-1'] });

    await expect(listSessionsForSub(redis, '')).resolves.toEqual([]);
    expect(calls).toEqual([]);
  });
});

describe('dropSubIndex', () => {
  it('deletes the whole index key', async () => {
    const { redis, sets } = makeFakeRedis({ members: ['sid-1', 'sid-2'] });

    await dropSubIndex(redis, SUB);

    expect(sets.has(subIndexKey(SUB))).toBe(false);
  });
});

// FR-005 / SC-007 / invariant I4. The bounded blast radius is the whole reason
// an index exists rather than a keyspace sweep; a stray SCAN would reintroduce
// O(total sessions) per revocation and make the operation unsafe under load.
describe('keyspace safety (invariant I4)', () => {
  it('never issues KEYS, SCAN or a wildcard pattern', async () => {
    const { redis, calls } = makeFakeRedis({ members: ['sid-1'] });

    await addSessionToSubIndex(redis, SUB, 'sid-2', NOW_S + 3600);
    await listSessionsForSub(redis, SUB);
    await removeSessionFromSubIndex(redis, SUB, 'sid-1');
    await dropSubIndex(redis, SUB);

    expect(calls.some(c => c.cmd === 'keys' || c.cmd === 'scan')).toBe(false);
    for (const call of calls) {
      for (const arg of call.args) {
        expect(String(arg)).not.toContain('*');
      }
    }
  });

  it('only ever addresses the one subject’s key', async () => {
    const { redis, calls } = makeFakeRedis({ members: ['sid-1'] });

    await addSessionToSubIndex(redis, SUB, 'sid-2', NOW_S + 3600);
    await listSessionsForSub(redis, SUB);

    const keys = new Set(calls.map(c => String(c.args[0])));
    expect([...keys]).toEqual([subIndexKey(SUB)]);
  });
});

/**
 * The subject-level revocation marker.
 *
 * It exists because the per-session tombstone is not a trustworthy record that
 * a revocation happened: express-session can write a live payload back over a
 * tombstone, and sessions minted before the index shipped are not in it at all.
 * The marker is keyed by subject and read on every request, so neither gap
 * reaches it.
 */
describe('subject revocation marker', () => {
  it('namespaces alongside the other subject-scoped keys', () => {
    expect(SUB_REVOKED_KEY_PREFIX).toBe('alkemio:subrevoked:');
    expect(subRevokedKey(SUB)).toBe(`alkemio:subrevoked:${SUB}`);
  });

  it('round-trips the revocation timestamp', async () => {
    const { redis } = makeFakeRedis();

    await markSubRevoked(redis, SUB, NOW_S, 2_592_000);

    await expect(getSubRevokedAt(redis, SUB)).resolves.toBe(NOW_S);
  });

  it('returns null when the subject has never been revoked', async () => {
    const { redis } = makeFakeRedis();

    await expect(getSubRevokedAt(redis, SUB)).resolves.toBeNull();
  });

  // If an earlier timestamp could overwrite a later one, the later revocation
  // would silently re-admit every session it was meant to kill.
  it('keeps the LATER timestamp when two revocations race', async () => {
    const { redis } = makeFakeRedis();

    await markSubRevoked(redis, SUB, NOW_S + 100, 2_592_000);
    await markSubRevoked(redis, SUB, NOW_S, 2_592_000); // the straggler

    await expect(getSubRevokedAt(redis, SUB)).resolves.toBe(NOW_S + 100);
  });

  it('advances the timestamp when a genuinely later revocation lands', async () => {
    const { redis } = makeFakeRedis();

    await markSubRevoked(redis, SUB, NOW_S, 2_592_000);
    await markSubRevoked(redis, SUB, NOW_S + 100, 2_592_000);

    await expect(getSubRevokedAt(redis, SUB)).resolves.toBe(NOW_S + 100);
  });

  // TTL is the absolute session ceiling: past it, no session old enough to be
  // affected can still exist, so the marker has nothing left to reject.
  it('expires with the absolute session ceiling', async () => {
    const { redis, getTtl } = makeFakeRedis();

    await markSubRevoked(redis, SUB, NOW_S, 2_592_000);

    expect(getTtl()).toBe(2_592_000);
  });

  it('never writes a non-positive TTL, which Redis reads as "delete now"', async () => {
    const { redis, getTtl } = makeFakeRedis();

    await markSubRevoked(redis, SUB, NOW_S, 0);

    expect(getTtl()).toBe(1);
  });

  it('is a no-op without a subject', async () => {
    const { redis, calls } = makeFakeRedis();

    await markSubRevoked(redis, '', NOW_S, 600);
    await expect(getSubRevokedAt(redis, '')).resolves.toBeNull();

    expect(calls).toEqual([]);
  });

  it('clears on request, for operator remediation', async () => {
    const { redis } = makeFakeRedis();

    await markSubRevoked(redis, SUB, NOW_S, 600);
    await clearSubRevoked(redis, SUB);

    await expect(getSubRevokedAt(redis, SUB)).resolves.toBeNull();
  });

  it('never issues a wildcard, KEYS or SCAN', async () => {
    const { redis, calls } = makeFakeRedis();

    await markSubRevoked(redis, SUB, NOW_S, 600);
    await getSubRevokedAt(redis, SUB);
    await clearSubRevoked(redis, SUB);

    expect(calls.some(c => c.cmd === 'keys' || c.cmd === 'scan')).toBe(false);
    for (const call of calls) {
      for (const arg of call.args) expect(String(arg)).not.toContain('*');
    }
  });
});
