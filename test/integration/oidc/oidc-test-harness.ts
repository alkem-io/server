import { OidcController } from '@core/auth/oidc/oidc.controller';
import { OidcService } from '@core/auth/oidc/oidc.service';
import {
  PRE_AUTH_COOKIE_NAME,
  PRE_AUTH_COOKIE_PATH,
  signPreAuthCookie,
} from '@core/auth/oidc/pre-auth-cookie';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import express, { type Request, type RequestHandler } from 'express';
import session from 'express-session';
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
};

export async function createOidcHarness(
  opts: { middleware?: RequestHandler[] } = {}
): Promise<OidcHarness> {
  const oidcService = buildOidcServiceMock();

  const moduleRef = await Test.createTestingModule({
    controllers: [OidcController],
    providers: [{ provide: OidcService, useValue: oidcService }],
  }).compile();

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
  for (const mw of opts.middleware ?? []) app.use(mw);
  await app.init();

  return {
    app,
    oidcService,
    sessionCookieName: 'alkemio_session',
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
