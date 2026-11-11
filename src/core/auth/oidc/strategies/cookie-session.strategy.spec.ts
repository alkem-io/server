import { ActorContext } from '@core/actor-context/actor.context';
import { ActorContextService } from '@core/actor-context/actor.context.service';
import { AuthenticationService } from '@core/authentication/authentication.service';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { describe, expect, it, vi } from 'vitest';
import { SecondFactorPolicyService } from '../../second-factor/second-factor.policy.service';
import { OIDC_REDIS_CLIENT } from '../oidc.tokens';
import type { AlkemioSessionPayload } from '../session-store.redis';
import {
  CookieSessionInvalidError,
  SecondFactorRequiredError,
} from './auth.errors';
import { SESSION_STORE_HANDLE } from './cookie-session.errors';
import { CookieSessionStrategy } from './cookie-session.strategy';

const notRefused = {
  provide: SecondFactorPolicyService,
  useValue: { assertNotRefused: vi.fn().mockResolvedValue(undefined) },
};

describe('CookieSessionStrategy session-lifetime stamping', () => {
  const NOW_S = 1_800_000_000;

  const buildPayload = (): AlkemioSessionPayload => ({
    access_token: 'at',
    id_token: 'idt',
    refresh_token: 'rt',
    expires_at: NOW_S + 600,
    absolute_expires_at: NOW_S + 2_592_000, // +30d, epoch-seconds
    sub: 'kratos-identity-id',
    alkemio_actor_id: 'actor-1',
    refresh_failure_count: 0,
    refresh_failure_streak_started_at: null,
    created_at: NOW_S - 3600, // 1h ago, epoch-seconds
    acr: null,
    client_id: 'alkemio-web',
  });

  const buildStrategy = async (payload: AlkemioSessionPayload | null) => {
    // The instance createActorContext resolves — stands in for the shared
    // actorID-keyed cached ActorContext.
    const sessionStore = {
      get: vi.fn().mockResolvedValue(payload),
      destroy: vi.fn(),
      markTerminated: vi.fn(),
    };
    const cachedContext = new ActorContext();
    cachedContext.actorID = 'actor-1';
    cachedContext.isAnonymous = false;
    cachedContext.credentials = [];

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MockWinstonProvider,
        CookieSessionStrategy,
        notRefused,
        {
          provide: SESSION_STORE_HANDLE,
          useValue: sessionStore,
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
      ],
    }).compile();

    return {
      strategy: module.get(CookieSessionStrategy),
      cachedContext,
      sessionStore,
    };
  };

  // server#6332 — the strategy now refuses to read the session store unless the
  // request actually PRESENTED the session cookie and express-session derived
  // this sid from it. So the harness must present the signed wire form
  // `s:<sid>.<sig>`; a bare sid or an empty cookie jar is, correctly, anonymous
  // now. The signature is never verified here (express-session already did
  // that upstream) — only the `s:<sid>.` prefix is checked.
  const request = {
    sessionID: 'sid-1',
    cookies: { alkemio_session: 's:sid-1.harness-signature' },
  } as any;

  it('stamps expiry / absoluteExpiry / issuedAt from the payload, converted to ms', async () => {
    const payload = buildPayload();
    const { strategy } = await buildStrategy(payload);

    const result = await strategy.validate(request);

    expect(result?.expiry).toBe(payload.expires_at * 1000);
    expect(result?.absoluteExpiry).toBe(payload.absolute_expires_at * 1000);
    expect(result?.issuedAt).toBe(payload.created_at * 1000);
    expect(result?.actorID).toBe('actor-1');
    expect(result?.isAnonymous).toBe(false);
  });

  it('never mutates the shared cached ActorContext (per-session values on a per-actor cache race)', async () => {
    const { strategy, cachedContext } = await buildStrategy(buildPayload());

    const result = await strategy.validate(request);

    expect(result).not.toBe(cachedContext);
    expect(cachedContext.expiry).toBeUndefined();
    expect(cachedContext.absoluteExpiry).toBeUndefined();
    expect(cachedContext.issuedAt).toBeUndefined();
  });

  it('does not stamp the anonymous fall-through (payload without alkemio_actor_id)', async () => {
    const payload = { ...buildPayload(), alkemio_actor_id: null };
    const { strategy } = await buildStrategy(payload);

    const result = await strategy.validate(request);

    expect(result?.isAnonymous).toBe(true);
    expect(result?.expiry).toBeUndefined();
    expect(result?.issuedAt).toBeUndefined();
  });

  it('returns null (anonymous fall-through) when no Redis payload exists', async () => {
    const { strategy } = await buildStrategy(null);

    const result = await strategy.validate(request);

    expect(result).toBeNull();
  });
});

/**
 * Regression coverage for defect D1 of alkem-io/server#6332 — contract
 * obligation S10, spec FR-028.
 *
 * THE assertion of this feature. Every one of these cases FAILS on `develop`
 * @ caa1a0d33, where the strategy reads `req.sessionID` unconditionally and so
 * issues a `sessionStore.get()` for a key that cannot exist. While Redis is up
 * that is an invisible wasted round trip; while it is down it is a
 * tens-of-seconds hang and then a 401, for a request that needed no session at
 * all — which is the difference between "signed-in users cannot authenticate"
 * and "the platform is down".
 *
 * Note what is asserted: the CALL COUNT, not the return value. The pre-fix code
 * also resolves these requests to anonymous — just via Redis first — so a
 * return-value assertion would pass on `develop` and prove nothing. FR-031.
 */
describe('CookieSessionStrategy — anonymous requests never touch the store (FR-028)', () => {
  const NOW_S = 1_800_000_000;

  const buildPayload = (): AlkemioSessionPayload => ({
    access_token: 'at',
    id_token: 'idt',
    refresh_token: 'rt',
    expires_at: NOW_S + 600,
    absolute_expires_at: NOW_S + 2_592_000,
    sub: 'kratos-identity-id',
    alkemio_actor_id: 'actor-1',
    refresh_failure_count: 0,
    refresh_failure_streak_started_at: null,
    created_at: NOW_S - 3600,
    acr: null,
    client_id: 'alkemio-web',
  });

  const build = async () => {
    const sessionStore = {
      get: vi.fn().mockResolvedValue(buildPayload()),
      destroy: vi.fn(),
      markTerminated: vi.fn(),
    };
    const cachedContext = new ActorContext();
    cachedContext.actorID = 'actor-1';
    cachedContext.isAnonymous = false;
    cachedContext.credentials = [];

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MockWinstonProvider,
        CookieSessionStrategy,
        notRefused,
        { provide: SESSION_STORE_HANDLE, useValue: sessionStore },
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
      ],
    }).compile();

    return { strategy: module.get(CookieSessionStrategy), sessionStore };
  };

  it('performs ZERO store operations for a request with no session cookie', async () => {
    const { strategy, sessionStore } = await build();

    // Exactly the shape express-session produces for a cookie-less request:
    // a freshly generated sessionID, and an empty cookie jar.
    const result = await strategy.validate({
      sessionID: 'generated-for-this-very-request',
      cookies: {},
    } as never);

    expect(sessionStore.get).not.toHaveBeenCalled();
    expect(sessionStore.destroy).not.toHaveBeenCalled();
    expect(sessionStore.markTerminated).not.toHaveBeenCalled();
    expect(result).toBeNull();
  });

  it('performs ZERO store operations when the request carries no cookies at all', async () => {
    const { strategy, sessionStore } = await build();

    const result = await strategy.validate({
      sessionID: 'generated-for-this-very-request',
    } as never);

    expect(sessionStore.get).not.toHaveBeenCalled();
    expect(result).toBeNull();
  });

  it('performs ZERO store operations when the cookie fails to account for the sid (FR-005)', async () => {
    const { strategy, sessionStore } = await build();

    // express-session discarded a bad-signature cookie and generated a fresh
    // sid. A presence-only guard would pass here and read the store anyway.
    const result = await strategy.validate({
      sessionID: 'freshly-generated',
      cookies: { alkemio_session: 's:somebody-elses-sid.sig' },
    } as never);

    expect(sessionStore.get).not.toHaveBeenCalled();
    expect(result).toBeNull();
  });

  it('still reads the store when the cookie DOES account for the sid', async () => {
    // The guard against over-correcting: it would be trivial to satisfy every
    // assertion above by never reading the store at all.
    const { strategy, sessionStore } = await build();

    const result = await strategy.validate({
      sessionID: 'sid-1',
      cookies: { alkemio_session: 's:sid-1.signature' },
    } as never);

    expect(sessionStore.get).toHaveBeenCalledWith('sid-1');
    expect(result?.isAnonymous).toBe(false);
  });
});

describe('CookieSessionStrategy — the second factor of the sign-in', () => {
  const NOW_S = Math.floor(Date.now() / 1000);

  const buildPayload = (
    overrides: Partial<AlkemioSessionPayload> = {}
  ): AlkemioSessionPayload => ({
    access_token: 'at',
    id_token: 'idt',
    refresh_token: 'rt',
    expires_at: NOW_S + 600,
    absolute_expires_at: NOW_S + 2_592_000,
    sub: 'kratos-identity-id',
    alkemio_actor_id: 'actor-1',
    refresh_failure_count: 0,
    refresh_failure_streak_started_at: null,
    created_at: NOW_S - 3600,
    acr: null,
    client_id: 'alkemio-web',
    ...overrides,
  });

  const build = async (
    payload: AlkemioSessionPayload,
    opts: { assertNotRefused?: () => Promise<void>; subRevokedAt?: number } = {}
  ) => {
    const cachedContext = Object.assign(new ActorContext(), {
      actorID: 'actor-1',
      credentials: [{ type: 'platform-support', resourceID: '' }],
    });
    const secondFactorPolicy = {
      assertNotRefused: vi.fn(
        opts.assertNotRefused ?? (() => Promise.resolve())
      ),
    };
    const redis = {
      get: vi.fn(() =>
        Promise.resolve(
          opts.subRevokedAt === undefined ? null : String(opts.subRevokedAt)
        )
      ),
      eval: vi.fn(() => Promise.resolve(1)),
      srem: vi.fn(() => Promise.resolve(1)),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MockWinstonProvider,
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
        { provide: ActorContextService, useValue: {} },
        {
          provide: ConfigService,
          useValue: { get: vi.fn().mockReturnValue('alkemio_session') },
        },
        { provide: SecondFactorPolicyService, useValue: secondFactorPolicy },
        { provide: OIDC_REDIS_CLIENT, useValue: redis },
      ],
    }).compile();
    return {
      strategy: module.get(CookieSessionStrategy),
      cachedContext,
      secondFactorPolicy,
    };
  };

  const request = () =>
    ({
      sessionID: 'sid-1',
      cookies: { alkemio_session: 's:sid-1.harness-signature' },
    }) as any;

  const refusalEvents = (records: any[]) =>
    records.filter(r => r.event_type === 'auth.second_factor.refused');

  it("stamps satisfied for an 'aal2' sign-in on the request copy only", async () => {
    const { strategy, cachedContext } = await build(
      buildPayload({ acr: 'aal2' })
    );

    const result = await strategy.validate(request());

    expect(result?.secondFactor).toEqual({ satisfied: true });
    expect(cachedContext.secondFactor).toBeUndefined();
  });

  it.each([
    ['aal1', 'aal1' as const],
    ['absent', null],
  ])('stamps not satisfied when acr is %s', async (_label, acr) => {
    const { strategy } = await build(buildPayload({ acr }));

    const result = await strategy.validate(request());

    expect(result?.secondFactor).toEqual({ satisfied: false });
  });

  it('keeps issuedAt at the sign-in start, created_at in milliseconds', async () => {
    const payload = buildPayload();
    const { strategy } = await build(payload);

    const result = await strategy.validate(request());

    expect(result?.issuedAt).toBe(payload.created_at * 1000);
  });

  it('asks the policy about the stamped copy and returns it when not refused', async () => {
    const { strategy, secondFactorPolicy } = await build(
      buildPayload({ acr: 'aal1' })
    );

    const { result, records } = await captureStdout(() =>
      strategy.validate(request())
    );

    expect(secondFactorPolicy.assertNotRefused).toHaveBeenCalledWith(
      result,
      expect.any(Date)
    );
    expect(result?.actorID).toBe('actor-1');
    expect(refusalEvents(records)).toEqual([]);
  });

  it('throws the refusal and records one refusal event with identifiers only', async () => {
    const { strategy } = await build(buildPayload(), {
      assertNotRefused: () => Promise.reject(new SecondFactorRequiredError()),
    });

    const { error, records } = await captureStdout(() =>
      strategy.validate(request())
    );

    expect(error).toBeInstanceOf(SecondFactorRequiredError);
    const events = refusalEvents(records);
    expect(events).toHaveLength(1);
    expect(events[0]).toEqual({
      event_type: 'auth.second_factor.refused',
      outcome: 'failure',
      error_code: 'second_factor_required',
      sub: 'kratos-identity-id',
      client_id: 'alkemio-web',
      correlation_id: expect.any(String),
      request_id: expect.any(String),
      timestamp: expect.any(String),
    });
  });

  it('rejects with a failed rule read unchanged, and records no refusal', async () => {
    const failure = new Error('connection terminated');
    const { strategy } = await build(buildPayload(), {
      assertNotRefused: () => Promise.reject(failure),
    });

    const { error, records } = await captureStdout(() =>
      strategy.validate(request())
    );

    expect(error).toBe(failure);
    expect(refusalEvents(records)).toEqual([]);
  });

  describe('the subject-revocation fence on the sign-in start', () => {
    const T = NOW_S - 100;

    it('rejects a sign-in that began before the marker', async () => {
      const { strategy } = await build(buildPayload({ created_at: T - 1 }), {
        subRevokedAt: T,
      });

      const { error } = await captureStdout(() => strategy.validate(request()));

      expect(error).toBeInstanceOf(CookieSessionInvalidError);
      expect((error as CookieSessionInvalidError).errorCode).toBe(
        'subject_revoked'
      );
    });

    it('accepts a sign-in that began after the marker', async () => {
      const { strategy } = await build(buildPayload({ created_at: T + 1 }), {
        subRevokedAt: T,
      });

      const result = await strategy.validate(request());

      expect(result?.actorID).toBe('actor-1');
    });
  });
});

async function captureStdout<T>(
  run: () => Promise<T>
): Promise<{ result?: T; error?: unknown; records: any[] }> {
  const records: any[] = [];
  const spy = vi
    .spyOn(process.stdout, 'write')
    .mockImplementation((chunk: any) => {
      try {
        records.push(JSON.parse(String(chunk)));
      } catch {
        // Not an audit record.
      }
      return true;
    });
  try {
    return { result: await run(), records };
  } catch (error) {
    return { error, records };
  } finally {
    spy.mockRestore();
  }
}
