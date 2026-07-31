import {
  addSessionToSubIndex,
  dropSubIndex,
  listSessionsForSub,
  removeSessionFromSubIndex,
  SUB_INDEX_KEY_PREFIX,
  subIndexKey,
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
      return sets.delete(key) ? 1 : 0;
    }),
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
  it('always pairs SADD with an EXPIRE (invariant I1)', async () => {
    const { redis, calls } = makeFakeRedis();

    await addSessionToSubIndex(redis, SUB, 'sid-1', NOW_S + 3600);

    expect(calls.map(c => c.cmd)).toEqual(['sadd', 'ttl', 'expire']);
    expect(calls[0].args).toEqual([subIndexKey(SUB), 'sid-1']);
    expect(calls[2].args).toEqual([subIndexKey(SUB), 3600]);
  });

  // Keyspace invariant I2. The single most damaging way to get this wrong:
  // a shortened TTL evicts a LIVE member's entry, the index under-reports, and
  // a later revocation silently misses a session while reporting success.
  it('never shortens the TTL when a later-expiring session joins (invariant I2)', async () => {
    // Existing key already expires in 2 hours; the joining session's own
    // ceiling is only 1 hour away.
    const { redis, calls } = makeFakeRedis({ members: ['sid-1'], ttl: 7200 });

    await addSessionToSubIndex(redis, SUB, 'sid-2', NOW_S + 3600);

    const expire = calls.find(c => c.cmd === 'expire');
    expect(expire?.args[1]).toBe(7200);
  });

  it('extends the TTL when the joining session outlives the current expiry', async () => {
    const { redis, calls } = makeFakeRedis({ members: ['sid-1'], ttl: 3600 });

    await addSessionToSubIndex(redis, SUB, 'sid-2', NOW_S + 7200);

    const expire = calls.find(c => c.cmd === 'expire');
    expect(expire?.args[1]).toBe(7200);
  });

  it.each([
    ['no key (-2)', -2],
    ['key without expiry (-1)', -1],
  ])('treats a %s TTL sentinel as "no TTL to preserve"', async (_label, t) => {
    const { redis, calls } = makeFakeRedis({ ttl: t });

    await addSessionToSubIndex(redis, SUB, 'sid-1', NOW_S + 600);

    expect(calls.find(c => c.cmd === 'expire')?.args[1]).toBe(600);
  });

  // A computed TTL of 0 or less would be read by Redis as "delete now",
  // silently dropping a set we just wrote to.
  it('floors the TTL at 1 second for an already-expired ceiling', async () => {
    const { redis, calls } = makeFakeRedis();

    await addSessionToSubIndex(redis, SUB, 'sid-1', NOW_S - 500);

    expect(calls.find(c => c.cmd === 'expire')?.args[1]).toBe(1);
  });

  it('floors the TTL at 1 second for a non-finite ceiling', async () => {
    const { redis, calls } = makeFakeRedis();

    await addSessionToSubIndex(redis, SUB, 'sid-1', Number.NaN);

    expect(calls.find(c => c.cmd === 'expire')?.args[1]).toBe(1);
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
