import { ActorContext } from '@core/actor-context/actor.context';
import { ActorContextService } from '@core/actor-context/actor.context.service';
import { AuthenticationService } from '@core/authentication/authentication.service';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import type { Request } from 'express';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { OidcService } from '../oidc.service';
import { OIDC_REDIS_CLIENT } from '../oidc.tokens';
import { addSessionToSubIndex } from '../session-index.redis';
import {
  type AlkemioSessionPayload,
  buildSessionStore,
  SESSION_KEY_PREFIX,
} from '../session-store.redis';
import { CookieSessionInvalidError } from '../strategies/auth.errors';
import { SESSION_STORE_HANDLE } from '../strategies/cookie-session.errors';
import { CookieSessionStrategy } from '../strategies/cookie-session.strategy';
import { OidcSessionRevocationService } from './oidc-session-revocation.service';

/**
 * The end-to-end evidence for server#6315.
 *
 * Every other spec in this feature proves that a *method was called*. This one
 * proves that **access actually ended** — it wires the real
 * `OidcSessionRevocationService` and the real `CookieSessionStrategy` to a
 * shared in-memory Redis and asserts that a request replayed after revocation
 * is rejected.
 *
 * That distinction is the whole point. The design input's compliance section
 * puts it bluntly: for a SOC 2 / ISO 27001 audit the useful artefact is
 * *deletion → audit record → proof the session was terminated → proof the next
 * request was rejected*, and "we call the method" is not evidence that access
 * ended. This file is the last link of that chain.
 *
 * It is also the regression guard for the single most dangerous way to get this
 * wrong: using `destroy` instead of `markTerminated`. A destroyed key makes the
 * strategy return `null` → anonymous fall-through → HTTP 200, which is the
 * reported bug in a new costume. A tombstone makes it throw → 401. The two
 * assertions below (`rejects` vs `not null`) are what tell those apart.
 */

const SUB = 'a1b2c3d4-0000-0000-0000-000000000001';
// The seeded sessions carry a real actor id on purpose: with a null one,
// `CookieSessionStrategy.validate` returns an ANONYMOUS context, which is
// non-null — so every `not.toBeNull()` assertion in this file would pass for a
// session that never authenticated at all.
const ACTOR_ID = 'actor-1';
const COOKIE_NAME = 'alkemio_session';
const DISPLAY_NAME = 'Deleted Person';
const EMAIL = 'deleted.person@example.com';

/** In-memory stand-in for the ioredis surface both collaborators use. */
function makeSharedRedis() {
  const strings = new Map<string, string>();
  const sets = new Map<string, Set<string>>();
  const ttls = new Map<string, number>();

  return {
    strings,
    sets,
    client: {
      get: async (key: string) => strings.get(key) ?? null,
      set: async (key: string, value: string) => {
        strings.set(key, value);
        return 'OK';
      },
      del: async (key: string) => {
        const had = strings.delete(key) || sets.delete(key);
        return had ? 1 : 0;
      },
      sadd: async (key: string, member: string) => {
        const set = sets.get(key) ?? new Set<string>();
        const added = set.has(member) ? 0 : 1;
        set.add(member);
        sets.set(key, set);
        return added;
      },
      srem: async (key: string, member: string) => {
        const set = sets.get(key);
        if (!set) return 0;
        const removed = set.delete(member) ? 1 : 0;
        if (set.size === 0) sets.delete(key);
        return removed;
      },
      smembers: async (key: string) => [...(sets.get(key) ?? [])],
      ttl: async (key: string) => ttls.get(key) ?? -2,
      expire: async (key: string, seconds: number) => {
        ttls.set(key, seconds);
        return 1;
      },
      /**
       * Interprets the two index Lua scripts. The atomic SADD + TTL roll and
       * the later-timestamp-wins revocation marker both live inside EVAL now,
       * so a fake that only recorded the call would test nothing.
       */
      eval: async (
        script: string,
        _numKeys: number,
        key: string,
        ...args: any[]
      ) => {
        if (script.includes("redis.call('SADD'")) {
          const [member, candidateRaw] = args as [string, string];
          const set = sets.get(key) ?? new Set<string>();
          const added = set.has(member) ? 0 : 1;
          set.add(member);
          sets.set(key, set);
          const candidate = Math.max(1, Number(candidateRaw));
          const current = ttls.get(key) ?? -1;
          if (current < 0 || candidate > current) ttls.set(key, candidate);
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
            ttls.set(key, nextTtl);
          } else if (nextTtl > (ttls.get(key) ?? -1)) {
            ttls.set(key, nextTtl);
          }
          return 1;
        }
        throw new Error(`fake redis: unrecognised script\n${script}`);
      },
    } as any,
  };
}

function seedPayload(sid: string): AlkemioSessionPayload {
  const nowS = Math.floor(Date.now() / 1000);
  return {
    access_token: `access-${sid}`,
    id_token: `id-${sid}`,
    refresh_token: `refresh-${sid}`,
    expires_at: nowS + 600,
    absolute_expires_at: nowS + 30 * 24 * 3600,
    sub: SUB,
    alkemio_actor_id: ACTOR_ID,
    refresh_failure_count: 0,
    refresh_failure_streak_started_at: null,
    created_at: nowS,
    client_id: 'alkemio-web',
    // The PII whose survival past a deletion is the GDPR Art. 17 half of the
    // defect: it lives in the session payload for up to the 30-day ceiling.
    request_context_cache: { display_name: DISPLAY_NAME, email: EMAIL },
    terminated_at: null,
    terminated_reason: null,
  };
}

async function buildStack(sids: string[]) {
  const shared = makeSharedRedis();
  const sessionStore = buildSessionStore(shared.client);

  // Seed live sessions and index them, exactly as the OIDC callback would.
  for (const sid of sids) {
    await shared.client.set(
      SESSION_KEY_PREFIX + sid,
      JSON.stringify(seedPayload(sid))
    );
    await addSessionToSubIndex(
      shared.client,
      SUB,
      sid,
      seedPayload(sid).absolute_expires_at
    );
  }

  const logger = {
    error: vi.fn(),
    warn: vi.fn(),
    log: vi.fn(),
    verbose: vi.fn(),
    debug: vi.fn(),
  };

  const moduleRef = await Test.createTestingModule({
    providers: [
      OidcSessionRevocationService,
      CookieSessionStrategy,
      { provide: OIDC_REDIS_CLIENT, useValue: shared.client },
      { provide: SESSION_STORE_HANDLE, useValue: sessionStore },
      {
        provide: OidcService,
        useValue: {
          getIssuer: () => ({
            metadata: { revocation_endpoint: 'https://hydra.test/revoke' },
          }),
        },
      },
      {
        provide: AuthenticationService,
        useValue: {
          createActorContext: vi.fn(async () =>
            Object.assign(new ActorContext(), {
              actorID: ACTOR_ID,
              isAnonymous: false,
              credentials: [],
            })
          ),
        },
      },
      {
        provide: ActorContextService,
        useValue: {
          createAnonymous: vi.fn(() => ({ actorID: '', isAnonymous: true })),
        },
      },
      {
        provide: ConfigService,
        useValue: {
          // Path-aware: the strategy asks for `…cookie.name` (a string), the
          // revocation service asks for `…cookie` (the object) to read
          // `absolute_ttl_s` for the marker TTL.
          get: vi.fn((path: string) =>
            path.endsWith('.cookie')
              ? { name: COOKIE_NAME, absolute_ttl_s: 2_592_000 }
              : COOKIE_NAME
          ),
        },
      },
      { provide: WINSTON_MODULE_NEST_PROVIDER, useValue: logger },
    ],
  }).compile();

  return {
    shared,
    sessionStore,
    revocation: moduleRef.get(OidcSessionRevocationService),
    strategy: moduleRef.get(CookieSessionStrategy),
  };
}

/** A request carrying the session cookie, as express-session would present it. */
function requestFor(sid: string): Request {
  return {
    sessionID: sid,
    cookies: { [COOKIE_NAME]: sid },
  } as unknown as Request;
}

let stdoutSpy: ReturnType<typeof vi.spyOn> | undefined;

beforeEach(() => {
  // Keep the audit stream out of the test output.
  stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
  vi.spyOn(globalThis, 'fetch' as any).mockImplementation(
    async () => ({ ok: true, status: 200 }) as any
  );
});

afterEach(() => {
  stdoutSpy?.mockRestore();
  vi.restoreAllMocks();
});

describe('revocation ends access (SC-001)', () => {
  it('a live session authenticates BEFORE revocation', async () => {
    const { strategy } = await buildStack(['sid-1']);

    // Baseline. `not.toBeNull()` is NOT enough here: an anonymous fall-through
    // also resolves to a non-null ActorContext, so a fixture that never
    // authenticated would satisfy it and every "still works" assertion below
    // would be vacuous. Assert the identity.
    await expect(strategy.validate(requestFor('sid-1'))).resolves.toMatchObject(
      { actorID: ACTOR_ID, isAnonymous: false }
    );
  });

  it('the next request after revocation is REJECTED, not silently anonymised', async () => {
    const { strategy, revocation } = await buildStack(['sid-1']);

    await revocation.revokeAllForSub(SUB, 'account_deleted');

    // Throwing → CookieSessionInvalidError → 401 UNAUTHENTICATED, which
    // deterministically flips client-web to signed-out.
    //
    // Returning null would mean anonymous fall-through with HTTP 200, and the
    // browser would keep rendering as signed-in — the exact half-state #6315
    // reports. `rejects` is therefore load-bearing: `not.toBeNull()` would pass
    // for a session that had merely been destroyed.
    await expect(strategy.validate(requestFor('sid-1'))).rejects.toBeInstanceOf(
      CookieSessionInvalidError
    );
  });

  it('surfaces the revocation reason on the rejection', async () => {
    const { strategy, revocation } = await buildStack(['sid-1']);

    await revocation.revokeAllForSub(SUB, 'account_deleted');

    await expect(strategy.validate(requestFor('sid-1'))).rejects.toMatchObject({
      message: expect.stringContaining('account_deleted'),
    });
  });

  it('kills every device — three concurrent sessions, none survives', async () => {
    const { strategy, revocation } = await buildStack([
      'sid-1',
      'sid-2',
      'sid-3',
    ]);

    const report = await revocation.revokeAllForSub(SUB, 'account_deleted');

    expect(report.revokedCount).toBe(3);
    for (const sid of ['sid-1', 'sid-2', 'sid-3']) {
      await expect(strategy.validate(requestFor(sid))).rejects.toBeInstanceOf(
        CookieSessionInvalidError
      );
    }
  });

  it('empties the subject index so a re-run has nothing left to do', async () => {
    const { shared, revocation } = await buildStack(['sid-1', 'sid-2']);

    await revocation.revokeAllForSub(SUB, 'account_deleted');

    expect(await shared.client.smembers(`alkemio:sub:${SUB}`)).toEqual([]);
  });

  it('is idempotent end to end — a second revocation changes nothing', async () => {
    const { strategy, revocation } = await buildStack(['sid-1']);

    await revocation.revokeAllForSub(SUB, 'account_deleted');
    const second = await revocation.revokeAllForSub(SUB, 'account_deleted');

    expect(second.complete).toBe(true);
    expect(second.failedCount).toBe(0);
    await expect(strategy.validate(requestFor('sid-1'))).rejects.toBeInstanceOf(
      CookieSessionInvalidError
    );
  });
});

describe('revocation erases the cached personal data (SC-003)', () => {
  // GDPR Art. 17. The session payload caches display name and email; before
  // this feature they survived a deletion in Redis for up to the 30-day
  // absolute ceiling. The tombstone is what discards them, which is the
  // strongest single argument for `markTerminated` over `destroy`.
  it('leaves no display name or email in the session store', async () => {
    const { shared, revocation } = await buildStack(['sid-1']);

    const before = shared.strings.get(`${SESSION_KEY_PREFIX}sid-1`) ?? '';
    expect(before).toContain(DISPLAY_NAME);
    expect(before).toContain(EMAIL);

    await revocation.revokeAllForSub(SUB, 'account_deleted');

    const after = shared.strings.get(`${SESSION_KEY_PREFIX}sid-1`) ?? '';
    expect(after).not.toContain(DISPLAY_NAME);
    expect(after).not.toContain(EMAIL);
    expect(JSON.parse(after).request_context_cache).toBeNull();
  });

  it('blanks every token field on the tombstone', async () => {
    const { shared, revocation } = await buildStack(['sid-1']);

    await revocation.revokeAllForSub(SUB, 'account_deleted');

    const tombstone = JSON.parse(
      shared.strings.get(`${SESSION_KEY_PREFIX}sid-1`) ?? '{}'
    );
    expect(tombstone.access_token).toBe('');
    expect(tombstone.id_token).toBe('');
    expect(tombstone.refresh_token).toBe('');
    expect(tombstone.terminated_at).toEqual(expect.any(Number));
    expect(tombstone.terminated_reason).toBe('account_deleted');
  });
});

describe('revocation leaves other subjects alone', () => {
  it('does not touch a session belonging to a different subject', async () => {
    const { shared, strategy, revocation } = await buildStack(['sid-1']);

    // A second person, signed in, indexed under their own subject.
    const otherSub = 'ffffffff-0000-0000-0000-000000000002';
    const otherPayload = { ...seedPayload('sid-other'), sub: otherSub };
    await shared.client.set(
      `${SESSION_KEY_PREFIX}sid-other`,
      JSON.stringify(otherPayload)
    );
    await addSessionToSubIndex(
      shared.client,
      otherSub,
      'sid-other',
      otherPayload.absolute_expires_at
    );

    await revocation.revokeAllForSub(SUB, 'account_deleted');

    // FR-005 — the blast radius is exactly one subject.
    await expect(
      strategy.validate(requestFor('sid-other'))
    ).resolves.toMatchObject({ actorID: ACTOR_ID, isAnonymous: false });
    expect(await shared.client.smembers(`alkemio:sub:${otherSub}`)).toEqual([
      'sid-other',
    ]);
  });
});

describe('revocation with exceptSid keeps the named session usable (SC-011)', () => {
  // The end-to-end version of contract C7 — the property client-web#10070 and
  // server#6073 both depend on. Asserting it against the real strategy is what
  // proves the excepted session still *authenticates*, not merely that it was
  // skipped.
  it('the excepted session still authenticates; the others do not', async () => {
    const { strategy, revocation } = await buildStack(['sid-keep', 'sid-drop']);

    await revocation.revokeAllForSub(SUB, 'password_changed', {
      exceptSid: 'sid-keep',
    });

    await expect(
      strategy.validate(requestFor('sid-keep'))
    ).resolves.toMatchObject({ actorID: ACTOR_ID, isAnonymous: false });
    await expect(
      strategy.validate(requestFor('sid-drop'))
    ).rejects.toBeInstanceOf(CookieSessionInvalidError);
  });
});

describe('revocation survives an authorization-server outage (FR-013)', () => {
  it('still ends platform access when the RFC 7009 call fails', async () => {
    const { strategy, revocation } = await buildStack(['sid-1']);
    vi.spyOn(globalThis, 'fetch' as any).mockRejectedValue(
      new Error('ECONNREFUSED')
    );

    const report = await revocation.revokeAllForSub(SUB, 'account_deleted');

    // Local certainty over remote completeness: the upstream refresh grant may
    // linger to its own expiry, but the session is dead here and now.
    expect(report.complete).toBe(false);
    await expect(strategy.validate(requestFor('sid-1'))).rejects.toBeInstanceOf(
      CookieSessionInvalidError
    );
  });
});

/**
 * The two ways a session can outlive `revokeAllForSub` even when it ran
 * successfully. Both are why the subject-level marker exists; neither is
 * reachable by the per-session tombstone alone.
 */
describe('revocation holds against a resurrected tombstone and an unindexed session', () => {
  it('stays revoked when an in-flight request writes the live payload back', async () => {
    const { strategy, revocation, shared } = await buildStack(['sid-1']);
    const livePayload = shared.strings.get(SESSION_KEY_PREFIX + 'sid-1');

    await revocation.revokeAllForSub(SUB, 'account_deleted');

    // Simulate the race precisely: a request that loaded the session BEFORE the
    // revocation now persists it — `req.session.save()` on /refresh, or the
    // lazy idle renewal firing at response end. express-session owns this key,
    // so the write lands and the tombstone is gone.
    await shared.client.set(SESSION_KEY_PREFIX + 'sid-1', livePayload!);
    const restored = JSON.parse(
      shared.strings.get(SESSION_KEY_PREFIX + 'sid-1')!
    );
    expect(restored.terminated_at).toBeFalsy(); // the tombstone really is gone
    // …and the sid is already out of the index, so a retry could not find it.
    expect(await shared.client.smembers(`alkemio:sub:${SUB}`)).toEqual([]);

    // The marker is the only remaining record of the revocation. It is enough.
    await expect(strategy.validate(requestFor('sid-1'))).rejects.toMatchObject({
      errorCode: 'subject_revoked',
    });
  });

  it('revokes a live session that was never in the index', async () => {
    // The pre-deployment population: minted before the index shipped, and the
    // self-heal has not run for it yet. `revokeAllForSub` enumerates nothing,
    // so without the marker this session keeps full access to the absolute
    // ceiling — exactly the #6315 defect, surviving its own fix.
    const { strategy, revocation, shared } = await buildStack([]);
    await shared.client.set(
      SESSION_KEY_PREFIX + 'sid-unindexed',
      JSON.stringify(seedPayload('sid-unindexed'))
    );

    const report = await revocation.revokeAllForSub(SUB, 'account_deleted');

    expect(report.entries).toEqual([]); // the index genuinely knew nothing
    expect(report.subjectMarked).toBe(true);
    await expect(
      strategy.validate(requestFor('sid-unindexed'))
    ).rejects.toMatchObject({ errorCode: 'subject_revoked' });
  });

  it('lets a session created AFTER the revocation authenticate', async () => {
    // What keeps the marker from being a permanent ban on the subject.
    const { strategy, revocation, shared } = await buildStack([]);
    await revocation.revokeAllForSub(SUB, 'account_deleted');

    const fresh = seedPayload('sid-fresh');
    fresh.created_at = Math.floor(Date.now() / 1000) + 5; // minted afterwards
    await shared.client.set(
      SESSION_KEY_PREFIX + 'sid-fresh',
      JSON.stringify(fresh)
    );

    await expect(
      strategy.validate(requestFor('sid-fresh'))
    ).resolves.toMatchObject({ actorID: ACTOR_ID, isAnonymous: false });
  });
});
