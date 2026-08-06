import { ActorContextService } from '@core/actor-context/actor.context.service';
import { OidcController } from '@core/auth/oidc/oidc.controller';
import { OidcService } from '@core/auth/oidc/oidc.service';
import {
  PRE_AUTH_COOKIE_NAME,
  PRE_AUTH_COOKIE_PATH,
  signPreAuthCookie,
} from '@core/auth/oidc/pre-auth-cookie';
import type {
  AlkemioSessionPayload,
  SessionStoreHandle,
} from '@core/auth/oidc/session-store.redis';
import { SESSION_STORE_HANDLE } from '@core/auth/oidc/strategies/cookie-session.errors';
import { cookieSessionStoreUnavailableMiddleware } from '@core/auth/oidc/strategies/cookie-session.exception-filter';
import { CookieSessionStrategy } from '@core/auth/oidc/strategies/cookie-session.strategy';
import { AUTH_STRATEGY_OIDC_COOKIE_SESSION } from '@core/auth/oidc/strategies/strategy.names';
import { AuthenticationService } from '@core/authentication/authentication.service';
import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import cookieParser from 'cookie-parser';
import { createHmac } from 'crypto';
import express, {
  type NextFunction,
  type Request,
  type RequestHandler,
  type Response,
} from 'express';
import session from 'express-session';
import passport from 'passport';
import { vi } from 'vitest';

export const PRE_AUTH_KEY_BYTES = new Uint8Array(32).fill(3);
export const SESSION_SIGNING_KEY = 'test-session-signing-key';
export const FIXED_STATE = 'state-0123456789abcdef0123456789abcdef';
export const FIXED_NONCE = 'nonce-0123456789abcdef0123456789abcdef';
export const FIXED_CODE_VERIFIER =
  'verifier-0123456789abcdef0123456789abcdef0123456789abcdef';
export const FIXED_CODE_CHALLENGE = 'challenge-of-FIXED_CODE_VERIFIER';

export type FakeTokenSet = {
  access_token: string;
  refresh_token: string;
  id_token: string;
  token_type: 'Bearer';
  expires_at: number;
  scope: string;
  claims(): Record<string, unknown>;
};

export type FakeIssuerMetadata = {
  issuer: string;
  end_session_endpoint: string;
};

export type MockOidcClient = {
  authorizationUrl: ReturnType<typeof vi.fn>;
  callback: ReturnType<typeof vi.fn>;
  refresh: ReturnType<typeof vi.fn>;
  revoke: ReturnType<typeof vi.fn>;
  metadata: { client_id: string };
};

export type OidcServiceMock = {
  getClient: ReturnType<typeof vi.fn>;
  getIssuer: ReturnType<typeof vi.fn>;
  getPreAuthSigningKey: ReturnType<typeof vi.fn>;
  getCookieSecure: ReturnType<typeof vi.fn>;
  getDefaultPostLogoutRedirectUri: ReturnType<typeof vi.fn>;
  client: MockOidcClient;
  issuerMetadata: FakeIssuerMetadata;
};

export function buildOidcServiceMock(): OidcServiceMock {
  const client: MockOidcClient = {
    authorizationUrl: vi.fn(
      (params: Record<string, string>) =>
        `http://hydra.example/oauth2/auth?${new URLSearchParams(params).toString()}`
    ),
    callback: vi.fn(),
    refresh: vi.fn(),
    revoke: vi.fn(),
    metadata: { client_id: 'alkemio-web' },
  };
  const issuerMetadata: FakeIssuerMetadata = {
    issuer: 'http://hydra.example/',
    end_session_endpoint: 'http://hydra.example/oauth2/sessions/logout',
  };
  return {
    getClient: vi.fn(() => client),
    getIssuer: vi.fn(() => ({ metadata: issuerMetadata })),
    getPreAuthSigningKey: vi.fn(() => PRE_AUTH_KEY_BYTES),
    getCookieSecure: vi.fn(() => false),
    getDefaultPostLogoutRedirectUri: vi.fn(
      () => 'http://localhost:3000/logout'
    ),
    client,
    issuerMetadata,
  };
}

export function buildFakeTokenSet(
  overrides: Partial<FakeTokenSet> = {}
): FakeTokenSet {
  const now = Math.floor(Date.now() / 1000);
  const claims = {
    sub: 'sub-kratos-123',
    alkemio_actor_id: 'actor-user-456',
    nonce: FIXED_NONCE,
    exp: now + 600,
    iat: now,
    aud: 'alkemio-web',
    iss: 'http://hydra.example/',
  };
  return {
    access_token: 'access-token-jwt',
    refresh_token: 'refresh-token-opaque',
    id_token: 'id-token-jwt',
    token_type: 'Bearer',
    expires_at: now + 600,
    scope: 'openid profile email offline_access alkemio',
    claims: () => claims,
    ...overrides,
  };
}

export type OidcHarness = {
  app: INestApplication;
  oidcService: OidcServiceMock;
  sessionCookieName: string;
  preAuthCookie(
    payload?: Partial<Parameters<typeof signPreAuthCookie>[0]>
  ): Promise<string>;
  sessionStore: ToggleableSessionStore;
  seedSession(sid: string, data?: Record<string, unknown>): Promise<void>;
  simulateRedisFailure(): void;
  simulateRedisRecovery(): void;
  /**
   * Per-method call counts on the EXPRESS-SESSION store — the one the session
   * middleware drives itself, ahead of any authentication code. FR-028's "zero
   * store operations" is a claim about the whole request, so it can only be
   * asserted here; the strategy-level obligation cannot observe these.
   */
  expressSessionStoreCalls: {
    get: number;
    set: number;
    touch: number;
    destroy: number;
  };
  resetExpressSessionStoreCalls(): void;
};

export type ToggleableSessionStore = SessionStoreHandle & {
  setFailing(failing: boolean): void;
  put(sid: string, payload: AlkemioSessionPayload): void;
  /**
   * Per-method call counts on the OIDC session-store handle — where defect D1
   * actually lived. `express-session` never issues a `store.get` for a request
   * that presents no cookie (it calls `generate()` outright), so counting only
   * the express-session store would leave a D1 regression invisible; the
   * strategy's `sessionStore.get(sid)` is the call that used to happen for
   * every anonymous request.
   */
  calls: { get: number; destroy: number; markTerminated: number };
  resetCalls(): void;
};

function buildToggleableSessionStore(): ToggleableSessionStore {
  const data = new Map<string, AlkemioSessionPayload>();
  const calls = { get: 0, destroy: 0, markTerminated: 0 };
  let failing = false;
  const failOrPass = <T>(): Promise<T> => {
    if (failing) {
      // Surface the actual ioredis-style symptom: a connection-level error.
      // The strategy maps any thrown value into SessionStoreUnavailableError.
      return Promise.reject(new Error('ECONNREFUSED'));
    }
    return undefined as unknown as Promise<T>;
  };
  return {
    calls,
    resetCalls() {
      calls.get = 0;
      calls.destroy = 0;
      calls.markTerminated = 0;
    },
    setFailing(value) {
      failing = value;
    },
    put(sid, payload) {
      data.set(sid, payload);
    },
    async get(sid) {
      calls.get += 1;
      if (failing) {
        await failOrPass<never>();
      }
      return data.get(sid) ?? null;
    },
    async destroy(sid) {
      calls.destroy += 1;
      if (failing) await failOrPass<never>();
      data.delete(sid);
    },
    async markTerminated(sid, reason, context) {
      calls.markTerminated += 1;
      if (failing) await failOrPass<never>();
      const existing = data.get(sid);
      data.set(sid, {
        access_token: '',
        id_token: '',
        refresh_token: '',
        expires_at: 0,
        absolute_expires_at: 0,
        sub: existing?.sub ?? context?.sub ?? '',
        alkemio_actor_id: null,
        refresh_failure_count: existing?.refresh_failure_count ?? 0,
        refresh_failure_streak_started_at:
          existing?.refresh_failure_streak_started_at ?? null,
        last_refreshed_at: existing?.last_refreshed_at ?? null,
        created_at: existing?.created_at ?? Date.now(),
        client_id: existing?.client_id ?? context?.client_id ?? '',
        request_context_cache: null,
        terminated_at: Date.now(),
        terminated_reason: reason,
      });
    },
  };
}

export async function createOidcHarness(
  opts: { middleware?: RequestHandler[] } = {}
): Promise<OidcHarness> {
  const oidcService = buildOidcServiceMock();
  const sessionStore = buildToggleableSessionStore();

  const moduleRef = await Test.createTestingModule({
    controllers: [OidcController],
    providers: [
      MockWinstonProvider,
      { provide: OidcService, useValue: oidcService },
      { provide: SESSION_STORE_HANDLE, useValue: sessionStore },
      {
        // Minimal ConfigService stub — production OidcController,
        // CookieSessionStrategy and CookieSessionStoreUnavailableFilter all
        // read `identity.authentication.providers.oidc(.cookie.name)` to
        // learn the per-env session cookie name. Callers use either the
        // parent path (then `.cookie.name` on the object) or the full
        // dotted path; the walker handles both so the harness doesn't care.
        // The cookie name is pinned to the historical default
        // `alkemio_session` so existing fixtures keep working.
        provide: ConfigService,
        useValue: (() => {
          const configTree = {
            identity: {
              authentication: {
                providers: {
                  oidc: {
                    cookie: { name: 'alkemio_session' },
                  },
                },
              },
            },
          };
          return {
            get: (path: string) =>
              path
                .split('.')
                .reduce<any>(
                  (node, segment) =>
                    node && typeof node === 'object'
                      ? node[segment]
                      : undefined,
                  configTree
                ),
          };
        })(),
      },
      {
        provide: AuthenticationService,
        useValue: {
          createActorContext: vi.fn(async (id: string) => ({
            isAnonymous: false,
            credentials: [],
            actorID: id,
          })),
        },
      },
      {
        provide: ActorContextService,
        useValue: {
          createAnonymous: vi.fn(() => ({
            isAnonymous: true,
            credentials: [],
          })),
        },
      },
      CookieSessionStrategy,
    ],
  }).compile();

  // Instantiate so the @nestjs/passport mixin registers the strategy globally
  // via passport.use('cookie-session', this).
  moduleRef.get(CookieSessionStrategy);

  const app = moduleRef.createNestApplication();
  app.use(cookieParser());
  app.use(express.json());
  // server#6332 — express-session needs a store it can actually FIND the
  // session in. With the default MemoryStore empty, `store.get(sid)` misses and
  // express-session calls `generate()`, which REASSIGNS `req.sessionID` to a
  // fresh random id. The cookie-session strategy now requires the presented
  // cookie to account for `req.sessionID`, so a regenerated id means "no
  // session presented" and the request resolves anonymous — correct behaviour,
  // but it means a spec that wants to exercise a store-dependent path must
  // first seed the sid here (see `seedSession` on the returned harness).
  const expressSessionStore = new session.MemoryStore();
  // server#6332 FR-001 / FR-028 / SC-001 — count what the SESSION MIDDLEWARE
  // does, not only what the strategy does. `express-session` calls
  // `store.get(req.sessionID)` itself, before any authentication code runs, so
  // the strategy-level S10 obligation cannot see it: a regression that made
  // every cookie-less request hit Redis again would leave S10 green. Counting
  // here is the only place the "zero store operations" claim can be asserted
  // for the WHOLE request.
  const expressSessionStoreCalls = { get: 0, set: 0, touch: 0, destroy: 0 };
  for (const method of ['get', 'set', 'touch', 'destroy'] as const) {
    const original = (
      expressSessionStore as unknown as Record<string, unknown>
    )[method];
    if (typeof original !== 'function') {
      continue;
    }
    (expressSessionStore as unknown as Record<string, unknown>)[method] =
      function (...args: unknown[]) {
        expressSessionStoreCalls[method] += 1;
        return (original as (...a: unknown[]) => unknown).apply(this, args);
      };
  }
  app.use(
    session({
      store: expressSessionStore,
      secret: SESSION_SIGNING_KEY,
      name: 'alkemio_session',
      resave: false,
      saveUninitialized: false,
      rolling: true,
      cookie: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        maxAge: 30 * 60 * 1000,
      },
    })
  );
  app.use(passport.initialize());
  // Stand-in /api/private/graphql to exercise the cookie-session strategy
  // end-to-end. T042a will replace this with the real GraphQL pipeline; the
  // contract validated here (FR-022b) is identical. Custom-callback form is
  // used so the no-session (401) path can re-issue the alkemio_session cookie
  // and never emit max-age=0 — FR-022b "MUST NOT clear cookie".
  // T074 test-only helper — simulates the stale-cookie branch where the
  // session exists but no id_token is stored (e.g. after a partial callback
  // failure or manual cleanup). Mutates `req.session.id_token = ''` and
  // saves; subsequent logout sees the no-id_token branch. Uses
  // `app.use('/__test__/wipe-id-token', ...)` to avoid Nest's `app.get(...)`
  // DI-lookup overload.
  app.use(
    '/__test__/wipe-id-token',
    (req: Request, res: Response, next: NextFunction) => {
      if (req.method !== 'GET') {
        next();
        return;
      }
      if (!req.session) {
        res.status(404).json({ error: 'no session' });
        return;
      }
      (req.session as Request['session'] & { id_token?: string }).id_token = '';
      req.session.save(err => {
        if (err) {
          res.status(500).json({ error: 'save failed' });
          return;
        }
        res.status(204).end();
      });
    }
  );

  app.use(
    '/api/private/graphql',
    (req: Request, res: Response, next: NextFunction) => {
      passport.authenticate(
        AUTH_STRATEGY_OIDC_COOKIE_SESSION,
        { session: false },
        (err: unknown, user: unknown) => {
          if (err) return next(err);
          const sid = req.cookies?.alkemio_session;
          if (typeof sid === 'string' && sid.length > 0) {
            res.cookie('alkemio_session', sid, {
              httpOnly: true,
              sameSite: 'lax',
              path: '/',
            });
          }
          if (!user) {
            res.status(401).json({ error: 'unauthenticated' });
            return;
          }
          (req as Request & { user?: unknown }).user = user;
          next();
        }
      )(req, res, next);
    },
    (_req: Request, res: Response) => {
      res.status(200).json({ data: { me: { id: 'placeholder' } } });
    }
  );
  app.use(cookieSessionStoreUnavailableMiddleware('alkemio_session'));
  for (const mw of opts.middleware ?? []) app.use(mw);
  await app.init();

  return {
    app,
    oidcService,
    sessionCookieName: 'alkemio_session',
    sessionStore,
    expressSessionStoreCalls,
    resetExpressSessionStoreCalls() {
      expressSessionStoreCalls.get = 0;
      expressSessionStoreCalls.set = 0;
      expressSessionStoreCalls.touch = 0;
      expressSessionStoreCalls.destroy = 0;
    },
    /**
     * Make express-session recognise `sid`, so it preserves it as
     * `req.sessionID` instead of generating a replacement.
     *
     * This models a browser holding a live session: the cookie unsigns, the
     * middleware finds the session, and the sid survives into the strategy —
     * which is the precondition for reaching the session store at all.
     */
    seedSession(sid: string, data: Record<string, unknown> = {}) {
      return new Promise<void>((resolve, reject) => {
        expressSessionStore.set(
          sid,
          {
            cookie: {
              originalMaxAge: 30 * 60 * 1000,
              expires: new Date(Date.now() + 30 * 60 * 1000),
              httpOnly: true,
              path: '/',
              sameSite: 'lax',
            },
            ...data,
          } as never,
          err => (err ? reject(err) : resolve())
        );
      });
    },
    simulateRedisFailure() {
      sessionStore.setFailing(true);
    },
    simulateRedisRecovery() {
      sessionStore.setFailing(false);
    },
    async preAuthCookie(payload = {}) {
      const full = {
        state: FIXED_STATE,
        nonce: FIXED_NONCE,
        code_verifier: FIXED_CODE_VERIFIER,
        returnTo: '/',
        issued_at: Math.floor(Date.now() / 1000),
        ...payload,
      };
      return signPreAuthCookie(full, PRE_AUTH_KEY_BYTES);
    },
  };
}

export function cookieHeader(name: string, value: string): string {
  return `${name}=${encodeURIComponent(value)}; Path=${PRE_AUTH_COOKIE_PATH}`;
}

/**
 * Produce a session cookie value express-session will actually ACCEPT.
 *
 * server#6332 — the cookie-session strategy no longer reads the session store
 * for a request whose cookie does not account for `req.sessionID`. A bare,
 * unsigned sid (which several specs used to send) is now correctly treated as
 * "no session presented" and resolves anonymous WITHOUT touching the store. To
 * exercise a store-dependent path a spec must present the real signed wire form.
 *
 * This reimplements `cookie-signature`'s `sign()` — `val + '.' + HMAC-SHA256
 * base64 with trailing '=' stripped` — rather than importing it: it is a
 * transitive dependency of express-session, not resolvable directly under
 * pnpm's strict layout, and this feature adds no dependency.
 */
export function signSessionCookie(
  sid: string,
  secret: string = SESSION_SIGNING_KEY
): string {
  const mac = createHmac('sha256', secret)
    .update(sid)
    .digest('base64')
    .replace(/=+$/, '');
  return `s:${sid}.${mac}`;
}

export function extractCookie(
  setCookieHeader: string | string[] | undefined,
  name: string
): string | null {
  if (!setCookieHeader) return null;
  const list = Array.isArray(setCookieHeader)
    ? setCookieHeader
    : [setCookieHeader];
  for (const header of list) {
    if (header.startsWith(`${name}=`)) return header;
  }
  return null;
}

export function parseCookieValue(header: string): string {
  const eq = header.indexOf('=');
  const semi = header.indexOf(';');
  return decodeURIComponent(
    header.slice(eq + 1, semi === -1 ? header.length : semi)
  );
}

export { PRE_AUTH_COOKIE_NAME, PRE_AUTH_COOKIE_PATH };

export type RequestWithSession = Request & {
  session: { id: string; destroy: (cb: () => void) => void };
};
