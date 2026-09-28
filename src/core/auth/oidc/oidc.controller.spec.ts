import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { createHash } from 'crypto';
import { describe, expect, it, vi } from 'vitest';
import { APP_VERIFIER_HEADER } from './constants';
import { OidcController } from './oidc.controller';
import { OidcService } from './oidc.service';
import { OIDC_REDIS_CLIENT } from './oidc.tokens';
import {
  PRE_AUTH_COOKIE_NAME,
  signPreAuthCookie,
  verifyPreAuthCookie,
} from './pre-auth-cookie';
import { subIndexKey } from './session-index.redis';
import { SESSION_STORE_HANDLE } from './strategies/cookie-session.errors';

// server#6315 / T037 — OidcController's index maintenance (FR-002, FR-003,
// FR-006). See specs/107-oidc-session-revocation/spec.md and
// contracts/redis-keyspace.md.

// `domain` is set here on purpose. Every deployed environment configures one
// (OIDC_SESSION_COOKIE_DOMAIN); only local dev leaves it empty. With it absent
// from the fixture, a clear that omits Domain looks identical to one that
// includes it, and the bug below was invisible to this suite for exactly that
// reason — the login SET carried Domain=… while every clear omitted it, so
// sign-out silently left the session cookie in the browser.
const COOKIE_CONFIG = {
  name: 'alkemio_session',
  absolute_ttl_s: 2_592_000,
  domain: 'alkem.io',
};
// FR-007 — the KRATOS cookie the app-mode callback has to clear. It is read
// from `identity.authentication.providers.ory.session_cookie_name`; there is
// no `providers.kratos` block in this config.
const KRATOS_SESSION_COOKIE_NAME = 'ory_kratos_session';
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
    // Express always populates both; the controller reads `req.query` to
    // decide app mode and `req.headers` to read the handoff verifier.
    query: {},
    headers: {},
    session: makeSession(),
    header: vi.fn(() => undefined),
    ...overrides,
  } as any;
}

async function buildController(opts?: {
  redis?: unknown;
  sessionStore?: unknown;
  oidcServiceOverrides?: Record<string, unknown>;
  /** FR-004 — an unmapped domain means app mode is unavailable. */
  cookieDomain?: string;
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
    {
      provide: ConfigService,
      useValue: {
        get: vi.fn((path: string) =>
          path === 'identity.authentication.providers.ory.session_cookie_name'
            ? KRATOS_SESSION_COOKIE_NAME
            : {
                ...COOKIE_CONFIG,
                domain: opts?.cookieDomain ?? COOKIE_CONFIG.domain,
              }
        ),
      },
    },
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

  // server#6315 — a Set-Cookie only clears an existing cookie when name, domain
  // and path all match; otherwise the browser keeps the original and stores a
  // second one. Confirmed against a running server with a domain configured:
  // the logout clear carried no Domain while the login set did, so the session
  // cookie survived sign-out in every environment that configures one.
  it('clears the session cookie with the SAME domain it was set with', async () => {
    const { redis } = makeFakeRedis();
    const { controller } = await buildController({ redis });

    const req = makeReq({
      cookies: { [COOKIE_CONFIG.name]: 's:sid-1.sig' },
      session: makeSession({ sub: 'sub-normal', id_token: 'id-token-value' }),
    });
    const res = makeRes();

    await controller.logout('id-token-value', undefined, req, res);

    const cleared = res.cookies.find(
      (c: { name: string; value: string }) =>
        c.name === COOKIE_CONFIG.name && c.value === ''
    );
    expect(cleared).toBeDefined();
    expect(cleared?.opts).toMatchObject({
      domain: COOKIE_CONFIG.domain,
      path: '/',
      maxAge: 0,
      httpOnly: true,
      sameSite: 'lax',
    });
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

// ───────────────────────────────────────────────────────────────────────────
// workspace#079-app-sso-handoff — native sign-in handoff.
// ───────────────────────────────────────────────────────────────────────────

const APP_VERIFIER = 'app-verifier-0123456789abcdefghijklmnopqrstuvwxyz';
/** 43 chars — the unpadded base64url length of a SHA-256 digest (FR-001). */
const APP_CHALLENGE = createHash('sha256')
  .update(APP_VERIFIER)
  .digest('base64url');
const APP_SCHEME = 'io.alkem.app';

/**
 * ioredis stand-in covering the handoff store's two commands plus the
 * per-subject index write `establishSession` makes.
 */
function makeHandoffRedis(opts?: {
  setImpl?: () => Promise<unknown>;
  getdelImpl?: () => Promise<string | null>;
}) {
  const store = new Map<string, string>();
  const redis: any = {
    eval: vi.fn(() => Promise.resolve(1)),
    srem: vi.fn(() => Promise.resolve(1)),
    get: vi.fn(() => Promise.resolve(null)),
    set: vi.fn((key: string, value: string) => {
      if (opts?.setImpl) return opts.setImpl();
      store.set(key, value);
      return Promise.resolve('OK');
    }),
    getdel: vi.fn((key: string) => {
      if (opts?.getdelImpl) return opts.getdelImpl();
      const value = store.get(key) ?? null;
      store.delete(key);
      return Promise.resolve(value);
    }),
  };
  return { redis, store };
}

/** Collect the JSON audit records emitted while `run` executes. */
async function captureAudit<T>(
  run: () => Promise<T>
): Promise<{ result: T; records: any[] }> {
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
  } finally {
    spy.mockRestore();
  }
}

function readIssuedPreAuth(res: any): string {
  const issued = res.cookies.find(
    (c: { name: string; value: string }) =>
      c.name === PRE_AUTH_COOKIE_NAME && c.value !== ''
  );
  expect(issued).toBeDefined();
  return issued.value;
}

function appTokenSet(nonce: string, issuedAt: number) {
  return {
    access_token: 'at',
    id_token: 'idt',
    refresh_token: 'rt',
    expires_at: issuedAt + 600,
    scope: 'openid profile',
    claims: () => ({ sub: 'sub-app', nonce, alkemio_actor_id: 'actor-app' }),
  };
}

describe('OidcController — /login decides app mode (FR-001/FR-002/FR-003)', () => {
  async function login(
    opts: {
      query?: Record<string, unknown>;
      cookie?: string;
      redis?: unknown;
      cookieDomain?: string;
    } = {}
  ) {
    const { redis } = makeHandoffRedis();
    const { controller } = await buildController({
      redis: opts.redis === null ? undefined : (opts.redis ?? redis),
      cookieDomain: opts.cookieDomain,
    });
    const query = opts.query ?? {};
    const req = makeReq({
      query,
      cookies: opts.cookie ? { [PRE_AUTH_COOKIE_NAME]: opts.cookie } : {},
    });
    const res = makeRes();
    await controller.login(
      query.returnTo as string | undefined,
      query.app_challenge as string | undefined,
      req,
      res
    );
    return { res };
  }

  it('enters app mode with a well-formed challenge, a mapped domain and Redis', async () => {
    const { res } = await login({ query: { app_challenge: APP_CHALLENGE } });
    const payload = await verifyPreAuthCookie(
      readIssuedPreAuth(res),
      PRE_AUTH_KEY
    );
    expect(payload.app_challenge).toBe(APP_CHALLENGE);
    expect(res.statusCode).toBe(302);
  });

  // The two tests below are the M2 contract: they are what lets `/callback`
  // carry no availability branch at all.
  it('does NOT enter app mode when the cookie domain is unmapped', async () => {
    const web = await login({});
    const attempted = await login({
      query: { app_challenge: APP_CHALLENGE },
      cookieDomain: 'acc-alkem.io',
    });
    const payload = await verifyPreAuthCookie(
      readIssuedPreAuth(attempted.res),
      PRE_AUTH_KEY
    );
    expect(payload.app_challenge).toBeUndefined();
    expect(attempted.res.statusCode).toBe(web.res.statusCode);
    expect(attempted.res.redirectedTo).toBe(web.res.redirectedTo);
  });

  it('does NOT enter app mode when no Redis client is wired', async () => {
    const web = await login({});
    const attempted = await login({
      query: { app_challenge: APP_CHALLENGE },
      redis: null,
    });
    const payload = await verifyPreAuthCookie(
      readIssuedPreAuth(attempted.res),
      PRE_AUTH_KEY
    );
    expect(payload.app_challenge).toBeUndefined();
    expect(attempted.res.statusCode).toBe(web.res.statusCode);
    expect(attempted.res.redirectedTo).toBe(web.res.redirectedTo);
  });

  it.each([
    ['42 chars', APP_CHALLENGE.slice(0, 42)],
    ['44 chars', `${APP_CHALLENGE}x`],
    ['base64 (not url) alphabet', `${APP_CHALLENGE.slice(0, 41)}+/`],
    ['non-string', ['a', 'b'] as unknown as string],
  ])('ignores a malformed challenge (%s) without failing the login', async (_label, challenge) => {
    const { res } = await login({ query: { app_challenge: challenge } });
    const payload = await verifyPreAuthCookie(
      readIssuedPreAuth(res),
      PRE_AUTH_KEY
    );
    expect(payload.app_challenge).toBeUndefined();
    expect(res.statusCode).toBe(302);
  });

  // Kratos' registration.after.oidc re-enters a BARE /login with no query
  // string, so a flag passed only as a query parameter is lost on exactly the
  // leg stickiness exists for — and `returnTo` is rebuilt from the query
  // alone, so carrying only the challenge would still drop the destination.
  it('carries both the challenge and the returnTo across a query-less re-entry', async () => {
    const cookie = await signPreAuthCookie(
      {
        state: 's',
        nonce: 'n',
        code_verifier: 'v',
        returnTo: '/spaces/alkemio',
        issued_at: Math.floor(Date.now() / 1000),
        app_challenge: APP_CHALLENGE,
      },
      PRE_AUTH_KEY
    );
    const { res } = await login({ cookie });
    const payload = await verifyPreAuthCookie(
      readIssuedPreAuth(res),
      PRE_AUTH_KEY
    );
    expect(payload.app_challenge).toBe(APP_CHALLENGE);
    expect(payload.returnTo).toBe('/spaces/alkemio');
  });

  it('carries nothing forward from a query-less re-entry in web mode', async () => {
    const cookie = await signPreAuthCookie(
      {
        state: 's',
        nonce: 'n',
        code_verifier: 'v',
        returnTo: '/spaces/alkemio',
        issued_at: Math.floor(Date.now() / 1000),
      },
      PRE_AUTH_KEY
    );
    const { res } = await login({ cookie });
    const payload = await verifyPreAuthCookie(
      readIssuedPreAuth(res),
      PRE_AUTH_KEY
    );
    expect(payload.app_challenge).toBeUndefined();
    expect(payload.returnTo).toBe('/');
  });

  // A web sign-in must never inherit app mode from an abandoned app flow in
  // the same (Android, Chrome-shared) cookie jar.
  it('starts a fresh decision when any query string is present', async () => {
    const cookie = await signPreAuthCookie(
      {
        state: 's',
        nonce: 'n',
        code_verifier: 'v',
        returnTo: '/spaces/alkemio',
        issued_at: Math.floor(Date.now() / 1000),
        app_challenge: APP_CHALLENGE,
      },
      PRE_AUTH_KEY
    );
    const { res } = await login({ query: { returnTo: '/x' }, cookie });
    const payload = await verifyPreAuthCookie(
      readIssuedPreAuth(res),
      PRE_AUTH_KEY
    );
    expect(payload.app_challenge).toBeUndefined();
    expect(payload.returnTo).toBe('/x');
  });
});

describe('OidcController — app-mode /callback hands off instead of signing in (FR-005/FR-007/FR-013)', () => {
  async function appCallback(opts: {
    redis: any;
    tokenSetImpl?: () => Promise<unknown>;
    challenge?: string;
  }) {
    const { controller, fakeClient } = await buildController({
      redis: opts.redis,
    });
    const nonce = 'nonce-app';
    const issuedAt = Math.floor(Date.now() / 1000);
    const cookie = await signPreAuthCookie(
      {
        state: 'state-app',
        nonce,
        code_verifier: 'verifier-app',
        returnTo: '/dashboard',
        issued_at: issuedAt,
        app_challenge: opts.challenge ?? APP_CHALLENGE,
      },
      PRE_AUTH_KEY
    );
    if (opts.tokenSetImpl) {
      fakeClient.callback.mockImplementation(opts.tokenSetImpl);
    } else {
      fakeClient.callback.mockResolvedValue(appTokenSet(nonce, issuedAt));
    }
    const req = makeReq({ cookies: { [PRE_AUTH_COOKIE_NAME]: cookie } });
    const res = makeRes();
    const { records } = await captureAudit(() =>
      controller.callback('state-app', 'auth-code', req, res)
    );
    return { controller, req, res, records, issuedAt };
  }

  it('establishes no session in the auth-browser jar and 302s to the app scheme', async () => {
    const { redis, store } = makeHandoffRedis();
    const { req, res } = await appCallback({ redis });

    expect(req.session.regenerate).not.toHaveBeenCalled();
    expect(
      res.cookies.some(
        (c: { name: string; value: string }) =>
          c.name === COOKIE_CONFIG.name && c.value !== ''
      )
    ).toBe(false);
    expect(res.redirectedTo).toMatch(
      new RegExp(`^${APP_SCHEME}:/auth/callback\\?code=[A-Za-z0-9_-]{43}$`)
    );
    expect(store.size).toBe(1);
  });

  // A-8, asserted in the one place both values are actually consumed.
  // server#6315: a clear that mismatches name, domain OR path leaves the
  // original cookie in place and stores a second one.
  it('clears the Kratos cookie with the full {name, domain, path, maxAge} quad', async () => {
    const { redis } = makeHandoffRedis();
    const { res } = await appCallback({ redis });

    const cleared = res.cookies.find(
      (c: { name: string; value: string }) =>
        c.name === KRATOS_SESSION_COOKIE_NAME
    );
    expect(cleared).toBeDefined();
    expect(cleared.value).toBe('');
    expect(cleared.opts).toEqual({
      domain: COOKIE_CONFIG.domain,
      path: '/',
      maxAge: 0,
    });
  });

  it('still clears the pre-auth cookie', async () => {
    const { redis } = makeHandoffRedis();
    const { res } = await appCallback({ redis });
    const cleared = res.cookies.find(
      (c: { name: string; value: string }) =>
        c.name === PRE_AUTH_COOKIE_NAME && c.value === ''
    );
    expect(cleared).toBeDefined();
    expect(cleared.opts).toMatchObject({ maxAge: 0 });
  });

  it('302s to the app scheme on token_exchange_failed instead of rendering HTML', async () => {
    const { redis } = makeHandoffRedis();
    const { res } = await appCallback({
      redis,
      tokenSetImpl: () => Promise.reject(new Error('hydra said no')),
    });
    expect(res.redirectedTo).toBe(
      `${APP_SCHEME}:/auth/callback?error=token_exchange_failed`
    );
    expect(res.send).not.toHaveBeenCalled();
  });

  it('302s to the app scheme on state_mismatch', async () => {
    const { redis } = makeHandoffRedis();
    const { controller } = await buildController({ redis });
    const cookie = await signPreAuthCookie(
      {
        state: 'real-state',
        nonce: 'n',
        code_verifier: 'v',
        returnTo: '/',
        issued_at: Math.floor(Date.now() / 1000),
        app_challenge: APP_CHALLENGE,
      },
      PRE_AUTH_KEY
    );
    const req = makeReq({ cookies: { [PRE_AUTH_COOKIE_NAME]: cookie } });
    const res = makeRes();
    await controller.callback('attacker-state', 'code', req, res);
    expect(res.redirectedTo).toBe(
      `${APP_SCHEME}:/auth/callback?error=state_mismatch`
    );
    expect(res.send).not.toHaveBeenCalled();
  });

  it('302s to the app scheme on nonce_mismatch', async () => {
    const { redis } = makeHandoffRedis();
    const { res } = await appCallback({
      redis,
      tokenSetImpl: () =>
        Promise.resolve(appTokenSet('attacker-nonce', Date.now())),
    });
    expect(res.redirectedTo).toBe(
      `${APP_SCHEME}:/auth/callback?error=nonce_mismatch`
    );
    expect(res.send).not.toHaveBeenCalled();
  });

  // An unhandled throw would 500 inside the auth browser, emit nothing, leave
  // the pre-auth cookie set and strand a live Hydra/Kratos session.
  it('302s with ?error=handoff_store_failed when the store rejects, and does not throw', async () => {
    const { redis } = makeHandoffRedis({
      setImpl: () => Promise.reject(new Error('redis unreachable')),
    });
    const { res } = await appCallback({ redis });
    expect(res.redirectedTo).toBe(
      `${APP_SCHEME}:/auth/callback?error=handoff_store_failed`
    );
    expect(res.send).not.toHaveBeenCalled();
  });

  it('leaves the web callback byte-identical when no challenge is present (FR-016)', async () => {
    const { redis } = makeHandoffRedis();
    const { controller, fakeClient } = await buildController({ redis });
    const nonce = 'nonce-web';
    const issuedAt = Math.floor(Date.now() / 1000);
    const cookie = await signPreAuthCookie(
      {
        state: 'state-web',
        nonce,
        code_verifier: 'v',
        returnTo: '/dashboard',
        issued_at: issuedAt,
      },
      PRE_AUTH_KEY
    );
    fakeClient.callback.mockResolvedValue(appTokenSet(nonce, issuedAt));
    const req = makeReq({ cookies: { [PRE_AUTH_COOKIE_NAME]: cookie } });
    const res = makeRes();
    await controller.callback('state-web', 'auth-code', req, res);

    expect(req.session.regenerate).toHaveBeenCalledOnce();
    expect(res.redirectedTo).toBe('/dashboard');
    expect(
      res.cookies.some(
        (c: { name: string }) => c.name === KRATOS_SESSION_COOKIE_NAME
      )
    ).toBe(false);
  });
});

describe('OidcController — GET /app-handoff redeems in the WebView (FR-008…FR-012, FR-017)', () => {
  /** Drive a real app-mode callback and return the code it handed out. */
  async function mintHandoff(redis: any) {
    const { controller, fakeClient } = await buildController({ redis });
    const nonce = 'nonce-app';
    const issuedAt = Math.floor(Date.now() / 1000);
    const cookie = await signPreAuthCookie(
      {
        state: 'state-app',
        nonce,
        code_verifier: 'v',
        returnTo: '/spaces/alkemio',
        issued_at: issuedAt,
        app_challenge: APP_CHALLENGE,
      },
      PRE_AUTH_KEY
    );
    fakeClient.callback.mockResolvedValue(appTokenSet(nonce, issuedAt));
    const res = makeRes();
    await controller.callback(
      'state-app',
      'auth-code',
      makeReq({ cookies: { [PRE_AUTH_COOKIE_NAME]: cookie } }),
      res
    );
    const code = new URL(
      res.redirectedTo.replace(':/', '://')
    ).searchParams.get('code');
    expect(code).toBeTruthy();
    return { controller, code: code as string, issuedAt };
  }

  async function redeem(
    controller: any,
    code: string,
    opts: {
      verifier?: string | string[];
      session?: any;
      query?: Record<string, unknown>;
    } = {}
  ) {
    const req = makeReq({
      query: { code, ...(opts.query ?? {}) },
      headers:
        opts.verifier === undefined
          ? {}
          : { [APP_VERIFIER_HEADER.toLowerCase()]: opts.verifier },
      ...(opts.session ? { session: opts.session } : {}),
    });
    const res = makeRes();
    const { records } = await captureAudit(() =>
      controller.appHandoff(code, req, res)
    );
    return { req, res, records };
  }

  function rejectionCodes(records: any[]): string[] {
    return records
      .filter(r => r.event_type === 'auth.app_handoff.rejected')
      .map(r => r.error_code);
  }

  it('happy path: establishes the session and 302s to the record returnTo', async () => {
    const { redis, store } = makeHandoffRedis();
    const { controller, code, issuedAt } = await mintHandoff(redis);
    const { req, res } = await redeem(controller, code, {
      verifier: APP_VERIFIER,
    });

    expect(req.session.regenerate).toHaveBeenCalledOnce();
    expect(res.redirectedTo).toBe('/spaces/alkemio');
    // FR-011 — created_at is the handoff's issue time, so subject-scoped
    // revocation windows bind to when the user actually authenticated.
    expect(req.session.created_at).toBe(issuedAt);
    // …and the session is registered in its subject's index exactly as a web
    // login registers one.
    expect(redis.eval).toHaveBeenCalled();
    expect(store.size).toBe(0);
  });

  it('rejects a replayed code and audits it', async () => {
    const { redis } = makeHandoffRedis();
    const { controller, code } = await mintHandoff(redis);
    await redeem(controller, code, { verifier: APP_VERIFIER });
    const { res, records } = await redeem(controller, code, {
      verifier: APP_VERIFIER,
    });

    expect(res.redirectedTo).toBe('/login?app_signin=failed');
    expect(rejectionCodes(records)).toEqual(['code_unknown_or_expired']);
  });

  it('rejects an unknown or expired code', async () => {
    const { redis } = makeHandoffRedis();
    const { controller } = await mintHandoff(redis);
    const { res, records } = await redeem(controller, 'never-issued', {
      verifier: APP_VERIFIER,
    });
    expect(res.redirectedTo).toBe('/login?app_signin=failed');
    expect(rejectionCodes(records)).toEqual(['code_unknown_or_expired']);
  });

  it('rejects a missing verifier header', async () => {
    const { redis, store } = makeHandoffRedis();
    const { controller, code } = await mintHandoff(redis);
    const { res, records } = await redeem(controller, code);
    expect(res.redirectedTo).toBe('/login?app_signin=failed');
    expect(rejectionCodes(records)).toEqual(['verifier_missing']);
    // FR-009 — burned before anything was checked.
    expect(store.size).toBe(0);
  });

  it('rejects a wrong verifier, and the code is gone either way (FR-009)', async () => {
    const { redis, store } = makeHandoffRedis();
    const { controller, code } = await mintHandoff(redis);
    const { req, res, records } = await redeem(controller, code, {
      verifier: 'not-the-verifier',
    });
    expect(res.redirectedTo).toBe('/login?app_signin=failed');
    expect(rejectionCodes(records)).toEqual(['verifier_mismatch']);
    expect(req.session.regenerate).not.toHaveBeenCalled();
    expect(store.size).toBe(0);
    expect(await redis.getdel(`alkemio:apphandoff:${code}`)).toBeNull();
  });

  // SIMP-079-A05 — unknown query parameters are ignored like everywhere else.
  // Rejecting `?verifier=` before the redeem would leave a stolen code live,
  // and could not un-log the URL that the access log already holds.
  it('ignores a ?verifier= query parameter: the header still decides', async () => {
    const { redis } = makeHandoffRedis();
    const { controller, code } = await mintHandoff(redis);
    const { res } = await redeem(controller, code, {
      verifier: APP_VERIFIER,
      query: { verifier: 'decoy' },
    });
    expect(res.redirectedTo).toBe('/spaces/alkemio');
  });

  it('burns the code even when ?verifier= is the only thing supplied', async () => {
    const { redis, store } = makeHandoffRedis();
    const { controller, code } = await mintHandoff(redis);
    const { res, records } = await redeem(controller, code, {
      verifier: 'wrong',
      query: { verifier: APP_VERIFIER },
    });
    expect(res.redirectedTo).toBe('/login?app_signin=failed');
    expect(rejectionCodes(records)).toEqual(['verifier_mismatch']);
    expect(store.size).toBe(0);
  });

  // COMP-079-2-06 — a raw Nest 500 would land in the app's MAIN FRAME.
  it('302s to the landing when the store is unreachable, and does not throw', async () => {
    const { redis } = makeHandoffRedis({
      getdelImpl: () => Promise.reject(new Error('ECONNREFUSED')),
    });
    const { controller, code } = await mintHandoff(redis);
    const { res, records } = await redeem(controller, code, {
      verifier: APP_VERIFIER,
    });
    expect(res.redirectedTo).toBe('/login?app_signin=failed');
    expect(rejectionCodes(records)).toEqual(['handoff_store_unavailable']);
  });

  // COMP-079-R4-07 — the code is already burned by this point, so the retry
  // has to come from a fresh sign-in rather than a replay of this one.
  it('302s to the landing when the session store rejects save(), and does not throw', async () => {
    const { redis, store } = makeHandoffRedis();
    const { controller, code } = await mintHandoff(redis);
    const session = makeSession();
    session.save = vi.fn((cb: (err?: unknown) => void) =>
      cb(new Error('session store unavailable'))
    );
    const { res, records } = await redeem(controller, code, {
      verifier: APP_VERIFIER,
      session,
    });
    expect(res.redirectedTo).toBe('/login?app_signin=failed');
    expect(rejectionCodes(records)).toEqual(['session_establish_failed']);
    expect(store.size).toBe(0);
  });

  // FR-017 / NFR-002 — the verifier and the code are the two secrets in this
  // flow; neither may reach a log line at any level.
  it('writes neither the verifier nor the code to any log', async () => {
    const { redis } = makeHandoffRedis();
    const { controller, code } = await mintHandoff(redis);
    const logger = MockWinstonProvider.useValue as Record<
      string,
      ReturnType<typeof vi.fn>
    >;
    for (const level of ['log', 'error', 'warn', 'debug', 'verbose']) {
      logger[level]?.mockClear?.();
    }

    await redeem(controller, code, { verifier: APP_VERIFIER });
    await redeem(controller, code, { verifier: APP_VERIFIER });

    const logged = ['log', 'error', 'warn', 'debug', 'verbose']
      .flatMap(level => logger[level]?.mock?.calls ?? [])
      .map(call => JSON.stringify(call))
      .join('\n');
    expect(logged).not.toContain(APP_VERIFIER);
    expect(logged).not.toContain(code);
  });
});
