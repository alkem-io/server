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
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
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
  simulateRedisFailure(): void;
  simulateRedisRecovery(): void;
};

export type ToggleableSessionStore = SessionStoreHandle & {
  setFailing(failing: boolean): void;
  put(sid: string, payload: AlkemioSessionPayload): void;
};

function buildToggleableSessionStore(): ToggleableSessionStore {
  const data = new Map<string, AlkemioSessionPayload>();
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
    setFailing(value) {
      failing = value;
    },
    put(sid, payload) {
      data.set(sid, payload);
    },
    async get(sid) {
      if (failing) {
        await failOrPass<never>();
      }
      return data.get(sid) ?? null;
    },
    async create(sid, payload) {
      if (failing) await failOrPass<never>();
      data.set(sid, payload);
    },
    async update(sid, payload) {
      if (failing) await failOrPass<never>();
      data.set(sid, payload);
    },
    async destroy(sid) {
      if (failing) await failOrPass<never>();
      data.delete(sid);
    },
    async markTerminated(sid, reason, context) {
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
      { provide: OidcService, useValue: oidcService },
      { provide: SESSION_STORE_HANDLE, useValue: sessionStore },
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
  app.use(
    session({
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
  app.use(cookieSessionStoreUnavailableMiddleware);
  for (const mw of opts.middleware ?? []) app.use(mw);
  await app.init();

  return {
    app,
    oidcService,
    sessionCookieName: 'alkemio_session',
    sessionStore,
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
