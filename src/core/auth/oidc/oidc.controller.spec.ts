import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { describe, expect, it, vi } from 'vitest';
import { OidcController } from './oidc.controller';
import { OidcService } from './oidc.service';
import { OIDC_REDIS_CLIENT } from './oidc.tokens';
import { PRE_AUTH_COOKIE_NAME, signPreAuthCookie } from './pre-auth-cookie';
import { subIndexKey } from './session-index.redis';
import { SESSION_STORE_HANDLE } from './strategies/cookie-session.errors';

// server#6315 / T037 — OidcController's index maintenance (FR-002, FR-003,
// FR-006). See specs/107-oidc-session-revocation/spec.md and
// contracts/redis-keyspace.md.

const COOKIE_CONFIG = { name: 'alkemio_session', absolute_ttl_s: 2_592_000 };
const PRE_AUTH_KEY = new TextEncoder().encode(
  'test-only-pre-auth-signing-key-0000000000000000'
);

/**
 * Minimal in-memory stand-in for the narrow ioredis surface the index uses
 * (same style as session-index.redis.spec.ts / the strategy index spec).
 * `saddImpl` / `sremImpl` let a test control exactly how a call settles,
 * without pulling in ioredis-mock.
 */
function makeFakeRedis(opts?: {
  saddImpl?: () => Promise<number>;
  sremImpl?: () => Promise<number>;
}) {
  const calls: { cmd: string; args: unknown[] }[] = [];
  // The membership write is a single EVAL now (atomic SADD + TTL roll), so the
  // knob that used to shape `sadd` shapes the script call instead.
  const sadd = vi.fn(
    (_script: string, _n: number, key: string, member: string) => {
      calls.push({ cmd: 'eval', args: [key, member] });
      return opts?.saddImpl ? opts.saddImpl() : Promise.resolve(1);
    }
  );
  const srem = vi.fn((key: string, member: string) => {
    calls.push({ cmd: 'srem', args: [key, member] });
    return opts?.sremImpl ? opts.sremImpl() : Promise.resolve(1);
  });
  const get = vi.fn(() => Promise.resolve(null));
  return { redis: { eval: sadd, srem, get } as any, calls, sadd, srem };
}

/** Hand-rolled express-shaped Response fake — no precedent in this repo for
 * mocking OidcController, so this is the smallest honest surface the
 * controller's methods touch (cookie/redirect/status/json/end). */
function makeRes() {
  const res: any = {
    cookies: [] as { name: string; value: string; opts?: unknown }[],
    statusCode: undefined as number | undefined,
    jsonBody: undefined as unknown,
    redirectedTo: undefined as string | undefined,
    ended: false,
    headers: {} as Record<string, string>,
  };
  res.cookie = vi.fn((name: string, value: string, opts?: unknown) => {
    res.cookies.push({ name, value, opts });
    return res;
  });
  res.redirect = vi.fn((status: number, url: string) => {
    res.statusCode = status;
    res.redirectedTo = url;
    return res;
  });
  res.status = vi.fn((code: number) => {
    res.statusCode = code;
    return res;
  });
  res.json = vi.fn((body: unknown) => {
    res.jsonBody = body;
    return res;
  });
  res.end = vi.fn(() => {
    res.ended = true;
    return res;
  });
  res.setHeader = vi.fn((k: string, v: string) => {
    res.headers[k] = v;
  });
  res.type = vi.fn(() => res);
  res.send = vi.fn(() => res);
  res.header = vi.fn(() => undefined);
  return res;
}

/** Hand-rolled express-session-shaped session fake. `destroy` optionally
 * scrubs `sub` first, mirroring real express-session behaviour, so tests can
 * prove the controller reads `sub` before calling it (FR-003). */
function makeSession(
  initial: Record<string, unknown> = {},
  opts?: { destroyClearsSub?: boolean }
) {
  const session: any = { ...initial };
  session.regenerate = vi.fn((cb: (err?: unknown) => void) => cb());
  session.save = vi.fn((cb: (err?: unknown) => void) => cb());
  session.destroy = vi.fn((cb: () => void) => {
    if (opts?.destroyClearsSub !== false) {
      delete session.sub;
    }
    cb();
  });
  return session;
}

function makeReq(overrides: Record<string, unknown> = {}) {
  return {
    sessionID: 'sid-1',
    cookies: {},
    session: makeSession(),
    header: vi.fn(() => undefined),
    ...overrides,
  } as any;
}

async function buildController(opts?: {
  redis?: unknown;
  sessionStore?: unknown;
  oidcServiceOverrides?: Record<string, unknown>;
}) {
  const fakeClient = {
    metadata: { client_id: 'alkemio-web', redirect_uris: ['https://cb'] },
    callback: vi.fn(),
    authorizationUrl: vi.fn(() => 'https://hydra.test/authorize?...'),
  };
  const oidcService = {
    getClient: vi.fn(() => fakeClient),
    getCookieSecure: vi.fn(() => true),
    getPreAuthSigningKey: vi.fn(() => PRE_AUTH_KEY),
    getIssuer: vi.fn(() => ({
      metadata: {
        end_session_endpoint: 'https://hydra.test/oauth2/sessions/logout',
      },
    })),
    getDefaultPostLogoutRedirectUri: vi.fn(() => 'https://app.test/logout'),
    ...opts?.oidcServiceOverrides,
  };

  const providers: any[] = [
    MockWinstonProvider,
    OidcController,
    { provide: OidcService, useValue: oidcService },
    { provide: ConfigService, useValue: { get: vi.fn(() => COOKIE_CONFIG) } },
  ];
  if (opts?.sessionStore !== undefined) {
    providers.push({
      provide: SESSION_STORE_HANDLE,
      useValue: opts.sessionStore,
    });
  }
  if (opts?.redis !== undefined) {
    providers.push({ provide: OIDC_REDIS_CLIENT, useValue: opts.redis });
  }

  const module: TestingModule = await Test.createTestingModule({
    providers,
  }).compile();

  return { controller: module.get(OidcController), oidcService, fakeClient };
}

// Lets fire-and-forget microtask chains settle without fake timers.
const flush = () => new Promise(resolve => setTimeout(resolve, 0));

describe('OidcController — callback registers the new session (FR-002)', () => {
  it('adds the new sid to alkemio:sub:<sub> on a successful callback', async () => {
    const { redis, sadd } = makeFakeRedis();
    const { controller, fakeClient } = await buildController({ redis });

    const state = 'state-1';
    const nonce = 'nonce-1';
    const codeVerifier = 'verifier-1';
    const issuedAt = Math.floor(Date.now() / 1000);
    const preAuthJws = await signPreAuthCookie(
      {
        state,
        nonce,
        code_verifier: codeVerifier,
        returnTo: '/dashboard',
        issued_at: issuedAt,
      },
      PRE_AUTH_KEY
    );

    fakeClient.callback.mockResolvedValue({
      access_token: 'at',
      id_token: 'idt',
      refresh_token: 'rt',
      expires_at: issuedAt + 600,
      scope: 'openid profile',
      claims: () => ({ sub: 'sub-1', nonce, alkemio_actor_id: 'actor-1' }),
    });

    const req = makeReq({
      cookies: { [PRE_AUTH_COOKIE_NAME]: preAuthJws },
    });
    const res = makeRes();

    await controller.callback(state, 'auth-code', req, res);

    expect(res.redirectedTo).toBe('/dashboard');
    expect(sadd).toHaveBeenCalledWith(
      expect.stringContaining("redis.call('SADD'"),
      1,
      subIndexKey('sub-1'),
      'sid-1',
      expect.any(String)
    );
  });

  // `regenerate()` destroys the old Redis session and mints a new sid. Nothing
  // else ever removes the old sid from the index — logout and revocation are
  // the only de-index paths and neither runs on a re-login — so without this
  // each re-login leaves a phantom member behind. Phantoms leak entries AND
  // pad the audit trail: a later revocation emits one `session.revoked` record
  // per phantom, with outcome=success, for sessions that no longer existed.
  it('de-indexes the sid that regenerate() destroyed, on re-login', async () => {
    const { redis, srem } = makeFakeRedis();
    const { controller, fakeClient } = await buildController({ redis });

    const state = 'state-2';
    const nonce = 'nonce-2';
    const issuedAt = Math.floor(Date.now() / 1000);
    const preAuthJws = await signPreAuthCookie(
      {
        state,
        nonce,
        code_verifier: 'verifier-2',
        returnTo: '/dashboard',
        issued_at: issuedAt,
      },
      PRE_AUTH_KEY
    );

    fakeClient.callback.mockResolvedValue({
      access_token: 'at',
      id_token: 'idt',
      refresh_token: 'rt',
      expires_at: issuedAt + 600,
      scope: 'openid profile',
      claims: () => ({ sub: 'sub-1', nonce, alkemio_actor_id: 'actor-1' }),
    });

    // A browser that already holds a session for this subject signs in again.
    const req = makeReq({
      sessionID: 'old-sid',
      cookies: { [PRE_AUTH_COOKIE_NAME]: preAuthJws },
      session: makeSession({ sub: 'sub-1' }),
    });
    // Mirror express-session: regenerate rotates the id.
    req.session.regenerate = vi.fn((cb: (err?: unknown) => void) => {
      req.sessionID = 'sid-1';
      cb();
    });
    const res = makeRes();

    await controller.callback(state, 'auth-code', req, res);

    expect(srem).toHaveBeenCalledWith(subIndexKey('sub-1'), 'old-sid');
  });

  it('does not de-index when the session id did not actually change', async () => {
    const { redis, srem } = makeFakeRedis();
    const { controller, fakeClient } = await buildController({ redis });

    const state = 'state-3';
    const nonce = 'nonce-3';
    const issuedAt = Math.floor(Date.now() / 1000);
    const preAuthJws = await signPreAuthCookie(
      {
        state,
        nonce,
        code_verifier: 'verifier-3',
        returnTo: '/dashboard',
        issued_at: issuedAt,
      },
      PRE_AUTH_KEY
    );

    fakeClient.callback.mockResolvedValue({
      access_token: 'at',
      id_token: 'idt',
      refresh_token: 'rt',
      expires_at: issuedAt + 600,
      scope: 'openid profile',
      claims: () => ({ sub: 'sub-1', nonce, alkemio_actor_id: 'actor-1' }),
    });

    const req = makeReq({
      cookies: { [PRE_AUTH_COOKIE_NAME]: preAuthJws },
      session: makeSession({ sub: 'sub-1' }),
    });
    const res = makeRes();

    await controller.callback(state, 'auth-code', req, res);

    // Guarded on the id having changed, so a store that reuses the id cannot
    // make this un-index the session being established.
    expect(srem).not.toHaveBeenCalled();
  });
});

describe('OidcController — index pruning on session end (FR-003)', () => {
  it('prunes the index in the refresh-failure teardown path (tearDownSession)', async () => {
    const { redis, srem } = makeFakeRedis();
    const { controller } = await buildController({ redis });

    const req = makeReq({
      session: makeSession({ sub: 'sub-teardown' }),
    });
    const res = makeRes();

    // tearDownSession is private; drive it via the public refresh() path that
    // calls it on a terminal refresh failure would need the OIDC refresh
    // dance too, so call the private method directly — it is the smallest
    // honest seam for this call site's own index-maintenance behaviour.
    await (controller as any).tearDownSession(req, res, {
      tombstoneReason: 'refresh_invalid_grant',
      sub: 'sub-teardown',
    });

    expect(srem).toHaveBeenCalledWith(subIndexKey('sub-teardown'), 'sid-1');
  });

  it('prunes the index on the stale-cookie branch of logout (no stored id_token, session cookie present)', async () => {
    const { redis, srem } = makeFakeRedis();
    const { controller } = await buildController({ redis });

    const req = makeReq({
      cookies: { [COOKIE_CONFIG.name]: 's:sid-1.sig' },
      session: makeSession({ sub: 'sub-stale' }), // no id_token
    });
    const res = makeRes();

    await controller.logout(undefined, undefined, req, res);

    expect(srem).toHaveBeenCalledWith(subIndexKey('sub-stale'), 'sid-1');
    expect(res.redirectedTo).toBeDefined();
  });

  it('prunes the index on the normal logout branch', async () => {
    const { redis, srem } = makeFakeRedis();
    const { controller } = await buildController({ redis });

    const idToken = 'id-token-value';
    const req = makeReq({
      cookies: { [COOKIE_CONFIG.name]: 's:sid-1.sig' },
      session: makeSession({
        sub: 'sub-normal',
        id_token: idToken,
        client_id: 'alkemio-web',
      }),
    });
    const res = makeRes();

    await controller.logout(idToken, undefined, req, res);

    expect(srem).toHaveBeenCalledWith(subIndexKey('sub-normal'), 'sid-1');
    expect(res.redirectedTo).toContain('oauth2/sessions/logout');
  });
});

describe('OidcController — sub is read before session.destroy (FR-003)', () => {
  it('prunes with the real sub even though destroy() clears it from the session first', async () => {
    const { redis, srem } = makeFakeRedis();
    const { controller } = await buildController({ redis });

    // Simulates real express-session behaviour: once destroy()'s callback
    // fires, the in-memory session object is gone/cleared. If the controller
    // read `sub` AFTER destroy, it would prune with `undefined` and silently
    // do nothing.
    const req = makeReq({
      cookies: { [COOKIE_CONFIG.name]: 's:sid-1.sig' },
      session: makeSession({ sub: 'sub-before-destroy' }),
    });
    const res = makeRes();

    await controller.logout(undefined, undefined, req, res);

    expect(req.session.sub).toBeUndefined(); // destroy() did clear it
    expect(srem).toHaveBeenCalledWith(
      subIndexKey('sub-before-destroy'),
      'sid-1'
    );
  });
});

describe('OidcController — index failures are swallowed and logged (FR-006)', () => {
  it('does not fail callback when the index write rejects, and logs a warn', async () => {
    const { redis, sadd } = makeFakeRedis({
      saddImpl: () => Promise.reject(new Error('redis unreachable')),
    });
    const { controller, fakeClient } = await buildController({ redis });
    const warnSpy = MockWinstonProvider.useValue.warn as ReturnType<
      typeof vi.fn
    >;

    const state = 'state-2';
    const nonce = 'nonce-2';
    const issuedAt = Math.floor(Date.now() / 1000);
    const preAuthJws = await signPreAuthCookie(
      {
        state,
        nonce,
        code_verifier: 'verifier-2',
        returnTo: '/dashboard',
        issued_at: issuedAt,
      },
      PRE_AUTH_KEY
    );
    fakeClient.callback.mockResolvedValue({
      access_token: 'at',
      id_token: 'idt',
      refresh_token: 'rt',
      expires_at: issuedAt + 600,
      scope: 'openid',
      claims: () => ({ sub: 'sub-fail', nonce, alkemio_actor_id: null }),
    });

    const req = makeReq({ cookies: { [PRE_AUTH_COOKIE_NAME]: preAuthJws } });
    const res = makeRes();

    await controller.callback(state, 'auth-code', req, res);
    await flush();

    expect(sadd).toHaveBeenCalled();
    expect(res.redirectedTo).toBe('/dashboard'); // login still succeeded
    expect(warnSpy).toHaveBeenCalled();
    expect(
      warnSpy.mock.calls.some((call: any[]) => call[0]?.sub === 'sub-fail')
    ).toBe(true);
  });

  it('does not fail logout when the index prune rejects, and logs a warn', async () => {
    const { redis, srem } = makeFakeRedis({
      sremImpl: () => Promise.reject(new Error('redis unreachable')),
    });
    const { controller } = await buildController({ redis });
    const warnSpy = MockWinstonProvider.useValue.warn as ReturnType<
      typeof vi.fn
    >;

    const idToken = 'id-token-value';
    const req = makeReq({
      cookies: { [COOKIE_CONFIG.name]: 's:sid-1.sig' },
      session: makeSession({ sub: 'sub-logout-fail', id_token: idToken }),
    });
    const res = makeRes();

    await controller.logout(idToken, undefined, req, res);
    await flush();

    expect(srem).toHaveBeenCalled();
    expect(res.redirectedTo).toContain('oauth2/sessions/logout'); // logout still completed
    expect(warnSpy).toHaveBeenCalled();
    expect(
      warnSpy.mock.calls.some(
        (call: any[]) => call[0]?.sub === 'sub-logout-fail'
      )
    ).toBe(true);

    warnSpy.mockRestore();
  });
});
