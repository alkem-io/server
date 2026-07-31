import { ActorContext } from '@core/actor-context/actor.context';
import { ActorContextService } from '@core/actor-context/actor.context.service';
import { AuthenticationService } from '@core/authentication/authentication.service';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
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
  const NOW_S = 1_800_000_000;
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
  function makeFakeRedis(opts?: { saddImpl?: () => Promise<number> }) {
    const calls: { cmd: string; args: unknown[] }[] = [];
    const sadd = vi.fn((key: string, member: string) => {
      calls.push({ cmd: 'sadd', args: [key, member] });
      return opts?.saddImpl ? opts.saddImpl() : Promise.resolve(1);
    });
    const ttl = vi.fn((key: string) => {
      calls.push({ cmd: 'ttl', args: [key] });
      return Promise.resolve(-2);
    });
    const expire = vi.fn((key: string, seconds: number) => {
      calls.push({ cmd: 'expire', args: [key, seconds] });
      return Promise.resolve(1);
    });
    return { redis: { sadd, ttl, expire } as any, calls, sadd, ttl, expire };
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

    expect(sadd).toHaveBeenCalledWith(subIndexKey(SUB), 'sid-1');
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
    const warnSpy = vi.spyOn(Logger.prototype, 'warn');

    const result = await strategy.validate(request);
    await flush();

    expect(result).not.toBeNull();
    expect(sadd).toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalled();
    expect(warnSpy.mock.calls.some(call => String(call[0]).includes(SUB))).toBe(
      true
    );

    warnSpy.mockRestore();
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
});
