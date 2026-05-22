import type { ActorContextService } from '@core/actor-context/actor.context.service';
import { BearerValidationError } from '@core/auth/oidc/strategies/auth.errors';
import {
  HydraBearerStrategy,
  type ServicePrincipalContext,
} from '@core/auth/oidc/strategies/hydra-bearer.strategy';
import type { AuthenticationService } from '@core/authentication/authentication.service';
import type { Request } from 'express';
import { type JWTVerifyGetKey, errors as joseErrors } from 'jose';
import { type Mock, vi } from 'vitest';

import type { RevokedBearerBlocklistService } from './service-client-cache/revoked-bearer-blocklist.service';
import type {
  CachedServiceClient,
  ServiceClientCacheService,
} from './service-client-cache/service-client-cache.service';

vi.mock('jose', async () => {
  const actual = await vi.importActual<typeof import('jose')>('jose');
  return {
    ...actual,
    jwtVerify: vi.fn(),
  };
});

import { jwtVerify } from 'jose';

/**
 * 004 T041 — Bearer admission contract test.
 *
 * Complements T037 (service-principal branch of `HydraBearerStrategy`)
 * by pinning the **resolver-facing context shape** populated on the
 * request (`req.servicePrincipal`), the **error-code surface** the
 * downstream interceptor mapper consumes, and the **scope-intersection
 * outcome** delivered to the resolver gate (T067).
 *
 * What this file covers (per spec tasks.md T041):
 *
 *   - bearer admitted as a service principal — `req.servicePrincipal`
 *     populated with the exact shape consumed by resolvers (FR-013,
 *     FR-015, FR-016);
 *   - **EXPIRED_BEARER** — strategy throws
 *     `BearerValidationError('token_expired', …)` on a `JWTExpired` from
 *     jose, distinguishable from the missing-claim / invalid-audience
 *     rejections at the error-code level so the interceptor mapper can
 *     surface a stable code to clients (`contracts/bff-bearer-service-principal.md`);
 *   - **FORBIDDEN_SCOPE distinguishability** — the strategy admits the
 *     bearer and surfaces an empty / non-empty `grantedScopes` list so
 *     the resolver gate (T067) can return a denial shape distinct from
 *     the `UNAUTHENTICATED` envelope emitted on admission failure
 *     (FR-016 + `audit-event-service-actor.md` single-emission rule);
 *   - **invalid_client at admission time** — a bearer whose `sub`
 *     matches the catalogue `clientId` regex but whose cache row is
 *     missing falls through to the legacy 003 rejection envelope
 *     (`missing_alkemio_actor_id` or `invalid_audience`), NOT a
 *     service-principal accept.
 *
 * What this file does **not** cover (out of scope at the strategy
 * seam, exercised elsewhere):
 *
 *   - Hydra-side rejection of unregistered credentials at `/oauth2/token`
 *     with `invalid_client` (Hydra contract — exercised by T046 e2e).
 *   - Resolver-layer `FORBIDDEN_SCOPE` GraphQL envelope shape (T067 + T068
 *     scope-denial audit — Phase 5).
 *   - Single-bearer revoke blocklist precedence (T037 covers; T087 wires).
 */

const STATIC_ALLOW_LIST = ['https://alkemio.example.com'];
const ISSUER = 'https://hydra.example.com/';

const SAMPLE_CACHED_ENABLED: CachedServiceClient = {
  name: 'Analytics Pipeline',
  status: 'enabled',
  scopes: ['platform:read', 'analytics:read'],
  audience: 'analytics-pipeline',
  accessTokenLifetimeSeconds: 600,
  tokenEndpointAuthMethod: 'client_secret_basic',
};

interface Harness {
  strategy: HydraBearerStrategy;
  cacheLookup: Mock;
  isBlocked: Mock;
  jwt: Mock;
}

function makeHarness(): Harness {
  const cacheLookup = vi.fn();
  const isBlocked = vi.fn().mockResolvedValue(false);
  const cache: Partial<ServiceClientCacheService> = { lookup: cacheLookup };
  const blocklist: Partial<RevokedBearerBlocklistService> = { isBlocked };

  const authService: Partial<AuthenticationService> = {
    createActorContext: vi.fn(),
  };
  const actorContextService: Partial<ActorContextService> = {};

  const strategy = new HydraBearerStrategy(
    {} as unknown as JWTVerifyGetKey,
    STATIC_ALLOW_LIST,
    ISSUER,
    authService as AuthenticationService,
    actorContextService as ActorContextService,
    cache as ServiceClientCacheService,
    blocklist as RevokedBearerBlocklistService
  );

  return {
    strategy,
    cacheLookup,
    isBlocked,
    jwt: vi.mocked(jwtVerify),
  };
}

function makeRequest(headers: Record<string, string>): Request {
  return { headers } as unknown as Request;
}

function jwtPayload(p: Record<string, unknown>) {
  return {
    payload: p,
    protectedHeader: { alg: 'RS256' },
  } as unknown as Awaited<ReturnType<typeof jwtVerify>>;
}

function pickSpContext(req: Request): ServicePrincipalContext | undefined {
  return (req as Request & { servicePrincipal?: ServicePrincipalContext })
    .servicePrincipal;
}

describe('HydraBearerStrategy — bearer admission contract (T041)', () => {
  describe('resolver-facing context shape (FR-013, FR-015)', () => {
    it('populates req.servicePrincipal with kind/clientId/name/grantedScopes', async () => {
      const h = makeHarness();
      h.cacheLookup.mockResolvedValueOnce(SAMPLE_CACHED_ENABLED);
      h.jwt.mockResolvedValueOnce(
        jwtPayload({
          sub: 'analytics-pipeline',
          aud: 'analytics-pipeline',
          scope: 'platform:read analytics:read',
          jti: 'jti-1',
          exp: Math.floor(Date.now() / 1_000) + 600,
          iat: Math.floor(Date.now() / 1_000),
        })
      );

      const req = makeRequest({ authorization: 'Bearer token-1' });
      await h.strategy.validate(req);

      const sp = pickSpContext(req);
      expect(sp).toBeDefined();
      expect(sp).toMatchObject({
        kind: 'service-principal',
        clientId: 'analytics-pipeline',
        // T043 — name comes from the catalogue row (cache field). The
        // sub-fallback still kicks in for legacy Redis entries that
        // predate the field; covered by the dedicated test below.
        name: 'Analytics Pipeline',
        grantedScopes: ['platform:read', 'analytics:read'],
      });
    });

    it('falls back name=clientId when cache row predates T043 (no name field)', async () => {
      const h = makeHarness();
      // Stale Redis entry — written before T043 added the `name` field.
      // The strategy must NOT NPE; it must populate `name = sub` so the
      // SP context still reaches resolvers usable for FR-015 gating.
      const legacyRow = {
        ...SAMPLE_CACHED_ENABLED,
      } as Partial<CachedServiceClient>;
      delete (legacyRow as { name?: unknown }).name;
      h.cacheLookup.mockResolvedValueOnce(legacyRow as CachedServiceClient);
      h.jwt.mockResolvedValueOnce(
        jwtPayload({
          sub: 'analytics-pipeline',
          aud: 'analytics-pipeline',
          scope: 'platform:read',
          jti: 'jti-legacy',
          exp: Math.floor(Date.now() / 1_000) + 600,
        })
      );

      const req = makeRequest({ authorization: 'Bearer token-legacy' });
      await h.strategy.validate(req);

      expect(pickSpContext(req)?.name).toBe('analytics-pipeline');
    });

    it('returns null from validate so passport does NOT resolve a user ActorContext', async () => {
      const h = makeHarness();
      h.cacheLookup.mockResolvedValueOnce(SAMPLE_CACHED_ENABLED);
      h.jwt.mockResolvedValueOnce(
        jwtPayload({
          sub: 'analytics-pipeline',
          aud: 'analytics-pipeline',
          scope: 'platform:read',
          jti: 'jti-2',
          exp: Math.floor(Date.now() / 1_000) + 600,
        })
      );

      const req = makeRequest({ authorization: 'Bearer token-2' });
      const result = await h.strategy.validate(req);

      // Service principals do NOT resolve to an `ActorContext`. The
      // service-principal context rides on the request side-channel.
      expect(result).toBeNull();
      expect(pickSpContext(req)).toBeDefined();
    });
  });

  describe('scope intersection delivers an empty list when bearer + configured disjoint (FR-016)', () => {
    it('admits with empty grantedScopes when bearer scope is empty (parked-client surface)', async () => {
      const h = makeHarness();
      h.cacheLookup.mockResolvedValueOnce(SAMPLE_CACHED_ENABLED);
      h.jwt.mockResolvedValueOnce(
        jwtPayload({
          sub: 'analytics-pipeline',
          aud: 'analytics-pipeline',
          scope: '',
          jti: 'jti-empty',
          exp: Math.floor(Date.now() / 1_000) + 600,
        })
      );

      const req = makeRequest({ authorization: 'Bearer token-empty' });
      await h.strategy.validate(req);
      const sp = pickSpContext(req);

      expect(sp?.grantedScopes).toEqual([]);
      // The resolver gate (T067) sees `grantedScopes: []` and emits the
      // FR-016 FORBIDDEN_SCOPE denial — distinguishable from the
      // UNAUTHENTICATED envelope that fires when no service-principal
      // context exists on the request at all (admission failure).
    });

    it('admits with the intersection when bearer scope ⊋ configured scope set', async () => {
      const h = makeHarness();
      h.cacheLookup.mockResolvedValueOnce(SAMPLE_CACHED_ENABLED);
      h.jwt.mockResolvedValueOnce(
        jwtPayload({
          sub: 'analytics-pipeline',
          aud: 'analytics-pipeline',
          // Bearer carries an extra scope (`platform:write`) the
          // catalogue has not configured for this client — the
          // intersection must silently drop it. The cache row in this
          // test only configures `platform:read` + `analytics:read`.
          scope: 'platform:read platform:write',
          jti: 'jti-3',
          exp: Math.floor(Date.now() / 1_000) + 600,
        })
      );

      const req = makeRequest({ authorization: 'Bearer token-3' });
      await h.strategy.validate(req);
      const sp = pickSpContext(req);

      expect(sp?.grantedScopes).toEqual(['platform:read']);
      expect(sp?.grantedScopes).not.toContain('platform:write');
    });
  });

  describe('EXPIRED_BEARER (FR-024a — bearer admission error surface)', () => {
    it('throws BearerValidationError("token_expired") when jose surfaces JWTExpired', async () => {
      const h = makeHarness();
      const jwtExpired = new joseErrors.JWTExpired(
        '"exp" claim timestamp check failed',
        // jose's JWTExpired throws with the payload as second argument;
        // the strategy does not depend on it but we ship a minimal shape
        // for type compatibility.
        {} as never
      );
      h.jwt.mockRejectedValueOnce(jwtExpired);

      const req = makeRequest({ authorization: 'Bearer token-expired' });
      await expect(h.strategy.validate(req)).rejects.toMatchObject({
        name: 'BearerValidationError',
        errorCode: 'token_expired',
      });
    });

    it('routes via the same code path regardless of grant type — expired-bearer is admission-level', async () => {
      // The strategy verifies the JWT BEFORE branching on
      // service-principal vs user-actor. A service-actor JWT that has
      // expired surfaces `token_expired` exactly as a user-actor JWT
      // would — keeps client-side handling uniform per
      // `contracts/bff-bearer-service-principal.md`.
      const h = makeHarness();
      h.jwt.mockRejectedValueOnce(
        new joseErrors.JWTExpired(
          '"exp" claim timestamp check failed',
          {} as never
        )
      );
      const req = makeRequest({ authorization: 'Bearer token-expired-2' });
      await expect(h.strategy.validate(req)).rejects.toBeInstanceOf(
        BearerValidationError
      );
      // No cache lookup should have been performed — JOSE-level
      // rejection short-circuits the service-principal branch entirely.
      expect(h.cacheLookup).not.toHaveBeenCalled();
    });
  });

  describe('unregistered credentials fall through to 003 UNAUTHENTICATED envelope', () => {
    it('rejects when sub matches the clientId regex but cache has no row', async () => {
      const h = makeHarness();
      // Cache lookup returns null → catalogue does not know this
      // clientId → service-principal branch falls through to the legacy
      // 003 path which rejects on missing `alkemio_actor_id`.
      h.cacheLookup.mockResolvedValueOnce(null);
      h.jwt.mockResolvedValueOnce(
        jwtPayload({
          sub: 'ghost-client',
          // Audience matches the legacy static allow-list so the FR-024a
          // `invalid_audience` rejection does NOT fire first; the
          // strategy proceeds to the missing-claim check.
          aud: STATIC_ALLOW_LIST[0],
          scope: 'platform:read',
          jti: 'jti-ghost',
          exp: Math.floor(Date.now() / 1_000) + 600,
        })
      );

      const req = makeRequest({ authorization: 'Bearer token-ghost' });
      await expect(h.strategy.validate(req)).rejects.toMatchObject({
        name: 'BearerValidationError',
        errorCode: 'missing_alkemio_actor_id',
      });
      expect(pickSpContext(req)).toBeUndefined();
    });

    it('rejects with invalid_audience when sub does not match catalogue regex AND aud not in static allow-list', async () => {
      const h = makeHarness();
      // sub is a UUID-shaped user id — does NOT match the catalogue
      // clientId regex (`^[a-z][a-z0-9-]{2,62}$` rejects uppercase / dots).
      h.jwt.mockResolvedValueOnce(
        jwtPayload({
          sub: 'A1B2C3D4-…',
          aud: 'unknown-audience',
          scope: '',
          jti: 'jti-unknown',
          exp: Math.floor(Date.now() / 1_000) + 600,
        })
      );

      const req = makeRequest({ authorization: 'Bearer token-unknown' });
      await expect(h.strategy.validate(req)).rejects.toMatchObject({
        name: 'BearerValidationError',
        errorCode: 'invalid_audience',
      });
      // Cache lookup not consulted: sub failed the catalogue regex
      // before the SP branch fired.
      expect(h.cacheLookup).not.toHaveBeenCalled();
    });
  });

  describe('disabled-client and revoked-bearer admission-time rejections', () => {
    it('rejects with service_client_disabled when cache reports status:disabled', async () => {
      const h = makeHarness();
      h.cacheLookup.mockResolvedValueOnce({
        ...SAMPLE_CACHED_ENABLED,
        status: 'disabled',
      });
      h.jwt.mockResolvedValueOnce(
        jwtPayload({
          sub: 'analytics-pipeline',
          aud: 'analytics-pipeline',
          scope: 'platform:read',
          jti: 'jti-disabled',
          exp: Math.floor(Date.now() / 1_000) + 600,
        })
      );

      const req = makeRequest({ authorization: 'Bearer token-disabled' });
      await expect(h.strategy.validate(req)).rejects.toMatchObject({
        name: 'BearerValidationError',
        errorCode: 'service_client_disabled',
      });
      expect(pickSpContext(req)).toBeUndefined();
    });

    it('rejects with token_revoked when blocklist reports the jti as blocked', async () => {
      const h = makeHarness();
      h.cacheLookup.mockResolvedValueOnce(SAMPLE_CACHED_ENABLED);
      h.isBlocked.mockResolvedValueOnce(true);
      h.jwt.mockResolvedValueOnce(
        jwtPayload({
          sub: 'analytics-pipeline',
          aud: 'analytics-pipeline',
          scope: 'platform:read',
          jti: 'jti-revoked',
          exp: Math.floor(Date.now() / 1_000) + 600,
        })
      );

      const req = makeRequest({ authorization: 'Bearer token-revoked' });
      await expect(h.strategy.validate(req)).rejects.toMatchObject({
        name: 'BearerValidationError',
        errorCode: 'token_revoked',
      });
      expect(pickSpContext(req)).toBeUndefined();
    });
  });
});
