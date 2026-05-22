import { ActorContextService } from '@core/actor-context/actor.context.service';
import { BearerValidationError } from '@core/auth/oidc/strategies/auth.errors';
import {
  HydraBearerStrategy,
  type ServicePrincipalContext,
} from '@core/auth/oidc/strategies/hydra-bearer.strategy';
import { AuthenticationService } from '@core/authentication/authentication.service';
import type { Request } from 'express';
import {
  exportJWK,
  generateKeyPair,
  type JWTPayload,
  type JWTVerifyGetKey,
  type KeyLike,
  SignJWT,
} from 'jose';
import { type Mock, vi } from 'vitest';

import type { RevokedBearerBlocklistService } from './service-client-cache/revoked-bearer-blocklist.service';
import type {
  CachedServiceClient,
  ServiceClientCacheService,
} from './service-client-cache/service-client-cache.service';

/**
 * 004 T041 — Bearer admission contract test.
 *
 * Complements T037 (service-principal branch of `HydraBearerStrategy`)
 * by pinning the **resolver-facing context shape** populated on the
 * request (`req.servicePrincipal`), the **error-code surface** the
 * downstream interceptor mapper consumes, and the **scope-intersection
 * outcome** delivered to the resolver gate (T067).
 *
 * **Isolation posture**: this file deliberately does NOT use
 * `vi.mock('jose', ...)`. The repo runs vitest with `isolate: false`
 * (`vitest.config.ts`) for module-cache reuse across spec files, which
 * makes file-scope `vi.mock` factories leak across worker boundaries
 * non-deterministically when ANY other spec consumes the same module
 * unmocked (e.g. `test/integration/oidc/bearer-test-harness.ts`
 * imports real `jose`). To avoid that leak, this file signs real JWTs
 * with a test-owned keypair and feeds the matching JWKS into
 * `HydraBearerStrategy` via `BEARER_JWKS_HANDLE` DI — the same pattern
 * `bearer-test-harness.ts` (003) uses.
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

const ISSUER = 'http://hydra.example';
const STATIC_ALLOW_LIST = ['https://alkemio.example.com'];
const KID = 'test-kid-t041';

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
  privateKey: KeyLike;
  sign: (claims: JWTPayload) => Promise<string>;
}

async function makeHarness(): Promise<Harness> {
  const cacheLookup = vi.fn();
  const isBlocked = vi.fn().mockResolvedValue(false);
  const cache: Partial<ServiceClientCacheService> = { lookup: cacheLookup };
  const blocklist: Partial<RevokedBearerBlocklistService> = { isBlocked };

  const authService: Partial<AuthenticationService> = {
    createActorContext: vi.fn(),
  };
  const actorContextService: Partial<ActorContextService> = {};

  // Real keypair — the strategy verifies signatures against the JWKS we
  // hand it via `BEARER_JWKS_HANDLE`. No jose-mock required.
  const { publicKey, privateKey } = await generateKeyPair('RS256', {
    extractable: true,
  });
  // Exported JWK kept for parity with the 003 bearer-test-harness shape,
  // even though we hand back a direct key resolver below.
  await exportJWK(publicKey);
  const jwks: JWTVerifyGetKey = async () => publicKey as KeyLike;

  const strategy = new HydraBearerStrategy(
    jwks,
    STATIC_ALLOW_LIST,
    ISSUER,
    authService as AuthenticationService,
    actorContextService as ActorContextService,
    cache as ServiceClientCacheService,
    blocklist as RevokedBearerBlocklistService
  );

  const sign = async (claims: JWTPayload): Promise<string> => {
    return new SignJWT(claims as Record<string, unknown>)
      .setProtectedHeader({ alg: 'RS256', kid: KID })
      .sign(privateKey);
  };

  return {
    strategy,
    cacheLookup,
    isBlocked,
    privateKey: privateKey as KeyLike,
    sign,
  };
}

function makeRequest(headers: Record<string, string>): Request {
  return { headers } as unknown as Request;
}

function pickSpContext(req: Request): ServicePrincipalContext | undefined {
  return (req as Request & { servicePrincipal?: ServicePrincipalContext })
    .servicePrincipal;
}

function inFuture(seconds: number): number {
  return Math.floor(Date.now() / 1_000) + seconds;
}

function inPast(seconds: number): number {
  return Math.floor(Date.now() / 1_000) - seconds;
}

describe('HydraBearerStrategy — bearer admission contract (T041)', () => {
  describe('resolver-facing context shape (FR-013, FR-015)', () => {
    it('populates req.servicePrincipal with kind/clientId/name/grantedScopes', async () => {
      const h = await makeHarness();
      h.cacheLookup.mockResolvedValueOnce(SAMPLE_CACHED_ENABLED);
      const token = await h.sign({
        iss: ISSUER,
        sub: 'analytics-pipeline',
        aud: 'analytics-pipeline',
        scope: 'platform:read analytics:read',
        jti: 'jti-1',
        iat: Math.floor(Date.now() / 1_000),
        exp: inFuture(600),
      });

      const req = makeRequest({ authorization: `Bearer ${token}` });
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
      const h = await makeHarness();
      const legacyRow = {
        ...SAMPLE_CACHED_ENABLED,
      } as Partial<CachedServiceClient>;
      delete (legacyRow as { name?: unknown }).name;
      h.cacheLookup.mockResolvedValueOnce(legacyRow as CachedServiceClient);
      const token = await h.sign({
        iss: ISSUER,
        sub: 'analytics-pipeline',
        aud: 'analytics-pipeline',
        scope: 'platform:read',
        jti: 'jti-legacy',
        exp: inFuture(600),
      });

      const req = makeRequest({ authorization: `Bearer ${token}` });
      await h.strategy.validate(req);

      expect(pickSpContext(req)?.name).toBe('analytics-pipeline');
    });

    it('returns null from validate so passport does NOT resolve a user ActorContext', async () => {
      const h = await makeHarness();
      h.cacheLookup.mockResolvedValueOnce(SAMPLE_CACHED_ENABLED);
      const token = await h.sign({
        iss: ISSUER,
        sub: 'analytics-pipeline',
        aud: 'analytics-pipeline',
        scope: 'platform:read',
        jti: 'jti-2',
        exp: inFuture(600),
      });

      const req = makeRequest({ authorization: `Bearer ${token}` });
      const result = await h.strategy.validate(req);

      expect(result).toBeNull();
      expect(pickSpContext(req)).toBeDefined();
    });
  });

  describe('scope intersection delivers an empty list when bearer + configured disjoint (FR-016)', () => {
    it('admits with empty grantedScopes when bearer scope is empty (parked-client surface)', async () => {
      const h = await makeHarness();
      h.cacheLookup.mockResolvedValueOnce(SAMPLE_CACHED_ENABLED);
      const token = await h.sign({
        iss: ISSUER,
        sub: 'analytics-pipeline',
        aud: 'analytics-pipeline',
        scope: '',
        jti: 'jti-empty',
        exp: inFuture(600),
      });

      const req = makeRequest({ authorization: `Bearer ${token}` });
      await h.strategy.validate(req);
      const sp = pickSpContext(req);

      expect(sp?.grantedScopes).toEqual([]);
    });

    it('admits with the intersection when bearer scope ⊋ configured scope set', async () => {
      const h = await makeHarness();
      h.cacheLookup.mockResolvedValueOnce(SAMPLE_CACHED_ENABLED);
      const token = await h.sign({
        iss: ISSUER,
        sub: 'analytics-pipeline',
        aud: 'analytics-pipeline',
        scope: 'platform:read platform:write',
        jti: 'jti-3',
        exp: inFuture(600),
      });

      const req = makeRequest({ authorization: `Bearer ${token}` });
      await h.strategy.validate(req);
      const sp = pickSpContext(req);

      expect(sp?.grantedScopes).toEqual(['platform:read']);
      expect(sp?.grantedScopes).not.toContain('platform:write');
    });
  });

  describe('EXPIRED_BEARER (FR-024a — bearer admission error surface)', () => {
    it('throws BearerValidationError("token_expired") when the bearer is past its exp window', async () => {
      const h = await makeHarness();
      // Real expired token: exp 5 minutes in the past — well beyond the
      // strategy's 30s clock tolerance. Real jose surfaces JWTExpired,
      // which `emitFailure` maps to error_code 'token_expired'.
      const token = await h.sign({
        iss: ISSUER,
        sub: 'analytics-pipeline',
        aud: 'analytics-pipeline',
        scope: 'platform:read',
        jti: 'jti-expired',
        iat: inPast(900),
        exp: inPast(300),
      });

      const req = makeRequest({ authorization: `Bearer ${token}` });
      await expect(h.strategy.validate(req)).rejects.toMatchObject({
        name: 'BearerValidationError',
        errorCode: 'token_expired',
      });
    });

    it('short-circuits before the service-principal branch (no cache lookup performed)', async () => {
      const h = await makeHarness();
      const token = await h.sign({
        iss: ISSUER,
        sub: 'analytics-pipeline',
        aud: 'analytics-pipeline',
        scope: 'platform:read',
        jti: 'jti-expired-2',
        iat: inPast(900),
        exp: inPast(300),
      });

      const req = makeRequest({ authorization: `Bearer ${token}` });
      await expect(h.strategy.validate(req)).rejects.toBeInstanceOf(
        BearerValidationError
      );
      expect(h.cacheLookup).not.toHaveBeenCalled();
    });
  });

  describe('unregistered credentials fall through to 003 UNAUTHENTICATED envelope', () => {
    it('rejects when sub matches the clientId regex but cache has no row', async () => {
      const h = await makeHarness();
      h.cacheLookup.mockResolvedValueOnce(null);
      const token = await h.sign({
        iss: ISSUER,
        sub: 'ghost-client',
        aud: STATIC_ALLOW_LIST[0],
        scope: 'platform:read',
        jti: 'jti-ghost',
        exp: inFuture(600),
      });

      const req = makeRequest({ authorization: `Bearer ${token}` });
      await expect(h.strategy.validate(req)).rejects.toMatchObject({
        name: 'BearerValidationError',
        errorCode: 'missing_alkemio_actor_id',
      });
      expect(pickSpContext(req)).toBeUndefined();
    });

    it('rejects with invalid_audience when sub does not match catalogue regex AND aud not in static allow-list', async () => {
      const h = await makeHarness();
      const token = await h.sign({
        iss: ISSUER,
        // Kratos-style scoped subject with a `:` — the `:` is NOT in
        // the catalogue clientId regex character class `[a-z0-9-]`, so
        // the SP branch is skipped before the cache lookup runs. The
        // strategy then falls through to the legacy 003 path, which
        // rejects on `invalid_audience` since `aud` isn't on the
        // static allow-list.
        sub: 'kratos:user-id-not-a-clientid',
        aud: 'unknown-audience',
        scope: '',
        jti: 'jti-unknown',
        exp: inFuture(600),
      });

      const req = makeRequest({ authorization: `Bearer ${token}` });
      await expect(h.strategy.validate(req)).rejects.toMatchObject({
        name: 'BearerValidationError',
        errorCode: 'invalid_audience',
      });
      expect(h.cacheLookup).not.toHaveBeenCalled();
    });
  });

  describe('disabled-client and revoked-bearer admission-time rejections', () => {
    it('rejects with service_client_disabled when cache reports status:disabled', async () => {
      const h = await makeHarness();
      h.cacheLookup.mockResolvedValueOnce({
        ...SAMPLE_CACHED_ENABLED,
        status: 'disabled',
      });
      const token = await h.sign({
        iss: ISSUER,
        sub: 'analytics-pipeline',
        aud: 'analytics-pipeline',
        scope: 'platform:read',
        jti: 'jti-disabled',
        exp: inFuture(600),
      });

      const req = makeRequest({ authorization: `Bearer ${token}` });
      await expect(h.strategy.validate(req)).rejects.toMatchObject({
        name: 'BearerValidationError',
        errorCode: 'service_client_disabled',
      });
      expect(pickSpContext(req)).toBeUndefined();
    });

    it('rejects with token_revoked when blocklist reports the jti as blocked', async () => {
      const h = await makeHarness();
      h.cacheLookup.mockResolvedValueOnce(SAMPLE_CACHED_ENABLED);
      h.isBlocked.mockResolvedValueOnce(true);
      const token = await h.sign({
        iss: ISSUER,
        sub: 'analytics-pipeline',
        aud: 'analytics-pipeline',
        scope: 'platform:read',
        jti: 'jti-revoked',
        exp: inFuture(600),
      });

      const req = makeRequest({ authorization: `Bearer ${token}` });
      await expect(h.strategy.validate(req)).rejects.toMatchObject({
        name: 'BearerValidationError',
        errorCode: 'token_revoked',
      });
      expect(pickSpContext(req)).toBeUndefined();
    });
  });
});
