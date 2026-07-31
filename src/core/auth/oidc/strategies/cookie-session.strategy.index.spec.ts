import { ActorContext } from '@core/actor-context/actor.context';
import { ActorContextService } from '@core/actor-context/actor.context.service';
import { AuthenticationService } from '@core/authentication/authentication.service';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { describe, expect, it, vi } from 'vitest';
import { OIDC_REDIS_CLIENT } from '../oidc.tokens';
import { subIndexKey } from '../session-index.redis';
import type { AlkemioSessionPayload } from '../session-store.redis';
import { CookieSessionInvalidError } from './auth.errors';
import { SESSION_STORE_HANDLE } from './cookie-session.errors';
import { CookieSessionStrategy } from './cookie-session.strategy';

// server#6315 / T036 — self-healing subject-index write performed by
// CookieSessionStrategy#validate (see FR-002a, FR-006, SC-011a, SC-011b, and
// keyspace invariant I5 in specs/107-oidc-session-revocation).
describe('CookieSessionStrategy self-healing subject index', () => {
  // Derived from the real clock, never a hardcoded epoch. `isAbsoluteTtlExceeded`
  // compares against `Date.now()`, so a literal here quietly becomes a session
  // that is "expired" once wall-clock time passes it — the suite would start
  // failing on a fixed future date with an unrelated-looking 401.
  const NOW_S = Math.floor(Date.now() / 1000);
  const SUB = 'kratos-identity-id';

  const buildPayload = (
    overrides: Partial<AlkemioSessionPayload> = {}
  ): AlkemioSessionPayload => ({
    access_token: 'at',
    id_token: 'idt',
    refresh_token: 'rt',
    expires_at: NOW_S + 600,
    absolute_expires_at: NOW_S + 2_592_000, // +30d, epoch-seconds, well into the future
    sub: SUB,
    alkemio_actor_id: 'actor-1',
    refresh_failure_count: 0,
    refresh_failure_streak_started_at: null,
    created_at: NOW_S - 3600,
    client_id: 'alkemio-web',
    ...overrides,
  });

  /**
   * Minimal in-memory stand-in for the narrow ioredis surface the index uses
   * (same style as session-index.redis.spec.ts). `saddImpl` lets each test
   * control exactly when/how the SADD call settles, without pulling in
   * ioredis-mock.
   */
  function makeFakeRedis(opts?: {
    saddImpl?: () => Promise<number>;
    /** Epoch-seconds to return from the subject revocation marker, if any. */
    subRevokedAt?: number | null;
    getImpl?: () => Promise<string | null>;
  }) {
    const calls: { cmd: string; args: unknown[] }[] = [];
    // The index write is one EVAL now; `saddImpl` still names the knob because
    // what a test wants to control is how the membership write settles.
    const evalFn = vi.fn(
      (_script: string, _n: number, key: string, ...args: any[]) => {
        calls.push({ cmd: 'eval', args: [key, ...args] });
        return opts?.saddImpl ? opts.saddImpl() : Promise.resolve(1);
      }
    );
    const get = vi.fn((key: string) => {
      calls.push({ cmd: 'get', args: [key] });
      if (opts?.getImpl) return opts.getImpl();
      const v = opts?.subRevokedAt;
      return Promise.resolve(v === undefined || v === null ? null : String(v));
    });
    return {
      redis: { eval: evalFn, get } as any,
      calls,
      sadd: evalFn,
      eval: evalFn,
      get,
    };
  }

  const buildStrategy = async (
    payload: AlkemioSessionPayload | null,
    redis?: unknown
  ) => {
    const cachedContext = new ActorContext();
    cachedContext.actorID = 'actor-1';
    cachedContext.isAnonymous = false;
    cachedContext.credentials = [];

    const providers: any[] = [
      CookieSessionStrategy,
      MockWinstonProvider,
      {
        provide: SESSION_STORE_HANDLE,
        useValue: {
          get: vi.fn().mockResolvedValue(payload),
          destroy: vi.fn(),
          markTerminated: vi.fn(),
        },
      },
      {
        provide: AuthenticationService,
        useValue: {
          createActorContext: vi.fn().mockResolvedValue(cachedContext),
        },
      },
      {
        provide: ActorContextService,
        useValue: {
          createAnonymous: vi
            .fn()
            .mockReturnValue(
              Object.assign(new ActorContext(), { isAnonymous: true })
            ),
        },
      },
      {
        provide: ConfigService,
        useValue: { get: vi.fn().mockReturnValue('alkemio_session') },
      },
    ];
    if (redis !== undefined) {
      providers.push({ provide: OIDC_REDIS_CLIENT, useValue: redis });
    }

    const module: TestingModule = await Test.createTestingModule({
      providers,
    }).compile();

    return { strategy: module.get(CookieSessionStrategy) };
  };

  const request = { sessionID: 'sid-1', cookies: {} } as any;

  // Lets the fire-and-forget `.catch()` chain inside reindexSession settle
  // before we assert on it, without touching fake timers (real epoch offsets
  // below rely on the actual wall clock).
  const flush = () => new Promise(resolve => setTimeout(resolve, 0));

  it('adds a live, previously-unindexed session to alkemio:sub:<sub> (SC-011a)', async () => {
    const { redis, sadd } = makeFakeRedis();
    const { strategy } = await buildStrategy(buildPayload(), redis);

    await strategy.validate(request);
    await flush();

    // One EVAL carrying the key, the member and the candidate TTL — the
    // SADD/TTL/EXPIRE trio is now a single atomic script.
    expect(sadd).toHaveBeenCalledWith(
      expect.stringContaining("redis.call('SADD'"),
      1,
      subIndexKey(SUB),
      'sid-1',
      expect.any(String)
    );
  });

  it('does not await the index write — validate resolves while SADD is still pending (SC-011b)', async () => {
    const pending = new Promise<number>(() => {
      // never resolves/rejects — proves validate() cannot be waiting on it.
    });
    const { redis } = makeFakeRedis({ saddImpl: () => pending });
    const { strategy } = await buildStrategy(buildPayload(), redis);

    await expect(strategy.validate(request)).resolves.not.toBeNull();
  });

  it('logs a warn and does not fail validate when the index write rejects (FR-006)', async () => {
    const { redis, sadd } = makeFakeRedis({
      saddImpl: () => Promise.reject(new Error('redis unreachable')),
    });
    const { strategy } = await buildStrategy(buildPayload(), redis);
    const warn = MockWinstonProvider.useValue.warn as ReturnType<typeof vi.fn>;

    const result = await strategy.validate(request);
    await flush();

    expect(result).not.toBeNull();
    expect(sadd).toHaveBeenCalled();
    expect(warn).toHaveBeenCalled();
    // Winston takes a structured payload plus a LogContext, so the subject is a
    // field rather than a substring of a formatted string.
    expect(warn.mock.calls.some((call: any[]) => call[0]?.sub === SUB)).toBe(
      true
    );
  });

  it('never re-indexes a tombstoned session (invariant I5)', async () => {
    const { redis, sadd } = makeFakeRedis();
    const payload = buildPayload({
      terminated_at: NOW_S - 10,
      terminated_reason: 'refresh_teardown',
    });
    const { strategy } = await buildStrategy(payload, redis);

    await expect(strategy.validate(request)).rejects.toBeInstanceOf(
      CookieSessionInvalidError
    );
    await flush();

    expect(sadd).not.toHaveBeenCalled();
  });

  it('never re-indexes a session whose absolute TTL is exceeded (invariant I5)', async () => {
    const { redis, sadd } = makeFakeRedis();
    const nowS = Math.floor(Date.now() / 1000);
    const payload = buildPayload({ absolute_expires_at: nowS - 1 });
    const { strategy } = await buildStrategy(payload, redis);

    await expect(strategy.validate(request)).rejects.toBeInstanceOf(
      CookieSessionInvalidError
    );
    await flush();

    expect(sadd).not.toHaveBeenCalled();
  });

  it('behaves exactly as before when no redis client is injected', async () => {
    const { strategy } = await buildStrategy(buildPayload());

    const result = await strategy.validate(request);

    expect(result).not.toBeNull();
    expect(result?.actorID).toBe('actor-1');
  });

  /**
   * The subject-level revocation marker, at the point it actually defends
   * anything: the request path.
   */
  describe('subject revocation marker', () => {
    it('rejects a session minted BEFORE the subject was revoked', async () => {
      const payload = buildPayload();
      // Revoked one second after this session was created.
      const { redis } = makeFakeRedis({
        subRevokedAt: payload.created_at + 1,
      });
      const { strategy } = await buildStrategy(payload, redis);

      await expect(strategy.validate(request)).rejects.toBeInstanceOf(
        CookieSessionInvalidError
      );
    });

    it('rejects even when the payload itself looks perfectly healthy', async () => {
      // This is the resurrected-tombstone case: an in-flight request wrote the
      // live payload back over the tombstone, so nothing in the session says
      // "revoked". The marker is the only thing left that does — and the sid
      // has already left the index, so a retry could not find it either.
      const payload = buildPayload({
        terminated_at: null,
        terminated_reason: null,
      });
      const { redis } = makeFakeRedis({
        subRevokedAt: payload.created_at + 1,
      });
      const { strategy } = await buildStrategy(payload, redis);

      await expect(strategy.validate(request)).rejects.toMatchObject({
        errorCode: 'subject_revoked',
      });
    });

    it('rejects a session that was never indexed, which the index alone cannot', async () => {
      // Pre-deployment population: the self-heal has not run for this session
      // yet, so `revokeAllForSub` enumerated nothing for it. The marker does
      // not depend on index membership.
      const payload = buildPayload();
      const { redis } = makeFakeRedis({
        subRevokedAt: payload.created_at + 1,
      });
      const { strategy } = await buildStrategy(payload, redis);

      await expect(strategy.validate(request)).rejects.toBeInstanceOf(
        CookieSessionInvalidError
      );
    });

    // What stops the marker being a permanent ban on the subject.
    it('admits a session minted AFTER the revocation', async () => {
      const payload = buildPayload();
      const { redis } = makeFakeRedis({
        subRevokedAt: payload.created_at - 1,
      });
      const { strategy } = await buildStrategy(payload, redis);

      await expect(strategy.validate(request)).resolves.toMatchObject({
        actorID: 'actor-1',
      });
    });

    it('admits every session when the subject has no marker at all', async () => {
      const { redis } = makeFakeRedis({ subRevokedAt: null });
      const { strategy } = await buildStrategy(buildPayload(), redis);

      await expect(strategy.validate(request)).resolves.toMatchObject({
        actorID: 'actor-1',
      });
    });

    // Fails OPEN, deliberately. A hard Redis outage never reaches this point —
    // the session read above would already have thrown 503 — so a failure here
    // means Redis is up and one command failed. Failing closed would sign out
    // the whole platform for the duration of a blip.
    it('allows the request but logs when the marker read fails', async () => {
      const { redis } = makeFakeRedis({
        getImpl: () => Promise.reject(new Error('redis hiccup')),
      });
      const { strategy } = await buildStrategy(buildPayload(), redis);
      const warn = MockWinstonProvider.useValue.warn as ReturnType<
        typeof vi.fn
      >;

      await expect(strategy.validate(request)).resolves.toMatchObject({
        actorID: 'actor-1',
      });
      expect(warn).toHaveBeenCalled();
    });

    it('is skipped entirely when no redis client is injected', async () => {
      const { strategy } = await buildStrategy(buildPayload());

      await expect(strategy.validate(request)).resolves.not.toBeNull();
    });
  });
});
