import {
  buildOidcSessionRedisStore,
  buildSessionRenewalMiddleware,
  SESSION_KEY_PREFIX,
} from './session-store.redis';

// Representative TTLs for the tests (the live values are config-driven). The
// ceiling sits well above the idle window, as the config invariant requires.
const TEST_IDLE_TTL_S = 14 * 24 * 60 * 60; // 14 days
const TEST_ABSOLUTE_TTL_S = 30 * 24 * 60 * 60; // 30 days

// FR-018 / FR-020a regression guard. connect-redis derives key TTL from the
// cookie `expires` by default; our store overrides that with a function so the
// Redis key tracks the idle window (capped by the ceiling) rather than whatever
// the cookie happens to say. Without this the session expires far too early and
// `disableTouch:true` blocks any recovery.
describe('buildOidcSessionRedisStore', () => {
  type CapturedSet = { key: string; ex: number };

  function makeFakeIoredis(captured: CapturedSet[]) {
    // No `scanIterator` → connect-redis treats it as ioredis and calls
    // `client.set(key, val, 'EX', ttl)`.
    return {
      set: vi.fn((key: string, _val: string, _mode: string, ttl: number) => {
        captured.push({ key, ex: ttl });
        return Promise.resolve('OK');
      }),
    } as any;
  }

  async function setSession(sess: any) {
    const captured: CapturedSet[] = [];
    const store = buildOidcSessionRedisStore(
      makeFakeIoredis(captured),
      TEST_IDLE_TTL_S
    );
    await new Promise<void>((resolve, reject) =>
      store.set('the-sid', sess, err => (err ? reject(err) : resolve()))
    );
    return captured;
  }

  it('keys the Redis TTL off the idle window, ignoring the cookie expiry', async () => {
    const nowS = Math.floor(Date.now() / 1000);
    const captured = await setSession({
      // 30-min cookie — must NOT drive the key TTL.
      cookie: { expires: new Date(Date.now() + 30 * 60 * 1000) },
      // ceiling far away → idle window is the binding constraint.
      absolute_expires_at: nowS + TEST_ABSOLUTE_TTL_S,
    });
    expect(captured).toHaveLength(1);
    expect(captured[0].key).toBe(`${SESSION_KEY_PREFIX}the-sid`);
    expect(captured[0].ex).toBe(TEST_IDLE_TTL_S);
  });

  it('caps the Redis TTL at the remaining time to the absolute ceiling', async () => {
    const nowS = Math.floor(Date.now() / 1000);
    // Ceiling only 1 hour away → key must not outlive it by the full idle window.
    const captured = await setSession({
      cookie: { expires: new Date(Date.now() + 30 * 60 * 1000) },
      absolute_expires_at: nowS + 3600,
    });
    expect(captured[0].ex).toBeLessThanOrEqual(3600);
    expect(captured[0].ex).toBeGreaterThan(3500);
  });
});

describe('buildSessionRenewalMiddleware', () => {
  const idleS = TEST_IDLE_TTL_S;
  const idleMs = idleS * 1000;

  function run(session: any) {
    const mw = buildSessionRenewalMiddleware(idleS);
    let called = false;
    mw({ session } as any, {}, () => {
      called = true;
    });
    return called;
  }

  it('does NOT renew while the session is in the front half of its window', () => {
    const session: any = { sub: 'u1', cookie: { maxAge: idleMs - 1000 } };
    run(session);
    expect(session.last_extended_at).toBeUndefined();
    expect(session.cookie.maxAge).toBe(idleMs - 1000);
  });

  it('renews once the session crosses the half-life mark', () => {
    const farCeiling = Math.floor(Date.now() / 1000) + TEST_ABSOLUTE_TTL_S;
    const session: any = {
      sub: 'u1',
      absolute_expires_at: farCeiling,
      cookie: { maxAge: idleMs / 2 - 1000 },
    };
    run(session);
    // dirty mark set → express-session will persist + re-issue the cookie
    expect(typeof session.last_extended_at).toBe('number');
    expect(session.cookie.maxAge).toBe(idleMs);
  });

  it('caps the renewed window at the absolute ceiling near end-of-life', () => {
    // 1 hour from the 30-day ceiling: the renewed window must shrink, not extend.
    const ceilingIn1h = Math.floor(Date.now() / 1000) + 3600;
    const session: any = {
      sub: 'u1',
      absolute_expires_at: ceilingIn1h,
      cookie: { maxAge: 1000 }, // deep in the back half → renewal due
    };
    run(session);
    expect(session.cookie.maxAge).toBeLessThanOrEqual(3600 * 1000);
    expect(session.cookie.maxAge).toBeGreaterThan(3500 * 1000);
  });

  it('skips anonymous and terminated sessions', () => {
    const anon: any = { cookie: { maxAge: 1 } };
    run(anon);
    expect(anon.last_extended_at).toBeUndefined();

    const dead: any = { sub: 'u1', terminated_at: 123, cookie: { maxAge: 1 } };
    run(dead);
    expect(dead.last_extended_at).toBeUndefined();
  });
});
