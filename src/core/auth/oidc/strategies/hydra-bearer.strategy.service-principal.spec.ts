import type { ActorContextService } from '@core/actor-context/actor.context.service';
import type { AuthenticationService } from '@core/authentication/authentication.service';
import type { RevokedBearerBlocklistService } from '@src/platform-admin/domain/service-clients/service-client-cache/revoked-bearer-blocklist.service';
import type {
  CachedServiceClient,
  ServiceClientCacheService,
} from '@src/platform-admin/domain/service-clients/service-client-cache/service-client-cache.service';
import type { Request } from 'express';
import {
  generateKeyPair,
  type JWTPayload,
  type JWTVerifyGetKey,
  type KeyLike,
  SignJWT,
} from 'jose';
import { type Mock, vi } from 'vitest';

import { BearerValidationError } from './auth.errors';
import {
  HydraBearerStrategy,
  type ServicePrincipalContext,
} from './hydra-bearer.strategy';

/**
 * 004 T037 — Contract tests for the service-principal branch of
 * `HydraBearerStrategy` (FR-013, FR-014, FR-015, FR-016, FR-017).
 *
 * **Isolation posture (revised 2026-05-22)**: this file originally
 * mocked `jose.jwtVerify` to inject arbitrary payload shapes. With the
 * repo's `isolate: false` vitest config the file-scope `vi.mock` factory
 * leaked across worker boundaries (when `bearer-test-harness.ts` etc.
 * imported real jose in the same worker, mocks from this file
 * intermittently corrupted those tests OR the cached real-module
 * corrupted these tests). Fix: sign real JWTs with a per-test keypair
 * and feed the JWKS into the strategy via `BEARER_JWKS_HANDLE` DI — the
 * same pattern `bearer-test-harness.ts` (003) uses. Same behavioural
 * coverage, no module-cache pollution.
 *
 * The 003 FR-024a UNAUTHENTICATED rejection envelope is represented by
 * `BearerValidationError('missing_alkemio_actor_id', ...)` being thrown
 * — the interceptor mapper turns that into the GraphQL UNAUTHENTICATED
 * response.
 */

const STATIC_ALLOW_LIST = ['https://alkemio.example.com'];
const ISSUER = 'http://hydra.example';
const KID = 'test-kid-t037';

const SAMPLE_CACHED_ENABLED: CachedServiceClient = {
  name: 'Analytics Pipeline',
  status: 'enabled',
  scopes: ['platform:read', 'analytics:read'],
  audience: 'analytics-pipeline',
  accessTokenLifetimeSeconds: 600,
  tokenEndpointAuthMethod: 'client_secret_basic',
};

const SAMPLE_CACHED_DISABLED: CachedServiceClient = {
  ...SAMPLE_CACHED_ENABLED,
  status: 'disabled',
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

  const { publicKey, privateKey } = await generateKeyPair('RS256', {
    extractable: true,
  });
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

  const sign = async (claims: JWTPayload): Promise<string> =>
    new SignJWT(claims as Record<string, unknown>)
      .setProtectedHeader({ alg: 'RS256', kid: KID })
      .sign(privateKey);

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

function inFuture(seconds: number): number {
  return Math.floor(Date.now() / 1_000) + seconds;
}

describe('HydraBearerStrategy — service-principal branch (T037)', () => {
  it('admits a bearer without alkemio_actor_id when sub matches an enabled clientId', async () => {
    const h = await makeHarness();
    h.cacheLookup.mockResolvedValueOnce(SAMPLE_CACHED_ENABLED);
    const token = await h.sign({
      iss: ISSUER,
      sub: 'analytics-pipeline',
      aud: 'analytics-pipeline',
      scope: 'platform:read analytics:read',
      jti: 'jti-1',
      exp: inFuture(600),
    });

    const req = makeRequest({ authorization: `Bearer ${token}` });
    const out = await h.strategy.validate(req);

    expect(out).toBeNull();
    const principal = (
      req as unknown as { servicePrincipal?: ServicePrincipalContext }
    ).servicePrincipal;
    expect(principal).toEqual({
      kind: 'service-principal',
      clientId: 'analytics-pipeline',
      // T043 — populated from the catalogue display name; the legacy
      // `sub` fallback applies only when the cache row predates T043.
      name: 'Analytics Pipeline',
      grantedScopes: ['platform:read', 'analytics:read'],
    });
  });

  it('intersects bearer.scope with cached configured set', async () => {
    const h = await makeHarness();
    h.cacheLookup.mockResolvedValueOnce({
      ...SAMPLE_CACHED_ENABLED,
      scopes: ['a', 'c'],
    });
    const token = await h.sign({
      iss: ISSUER,
      sub: 'analytics-pipeline',
      aud: 'analytics-pipeline',
      scope: 'a b c',
      jti: 'jti-2',
      exp: inFuture(600),
    });

    const req = makeRequest({ authorization: `Bearer ${token}` });
    await h.strategy.validate(req);
    const principal = (
      req as unknown as { servicePrincipal?: ServicePrincipalContext }
    ).servicePrincipal;
    expect(principal?.grantedScopes).toEqual(['a', 'c']);
  });

  it('rejects when the cache reports status: disabled', async () => {
    const h = await makeHarness();
    h.cacheLookup.mockResolvedValue(SAMPLE_CACHED_DISABLED);
    const token = await h.sign({
      iss: ISSUER,
      sub: 'analytics-pipeline',
      aud: 'analytics-pipeline',
      scope: 'platform:read',
      jti: 'jti-3',
      exp: inFuture(600),
    });

    const req = makeRequest({ authorization: `Bearer ${token}` });
    const rejected = h.strategy.validate(req);
    await expect(rejected).rejects.toBeInstanceOf(BearerValidationError);
    await expect(rejected).rejects.toMatchObject({
      errorCode: 'service_client_disabled',
    });
  });

  it('rejects when aud is outside the allow-list (cached aud mismatch)', async () => {
    const h = await makeHarness();
    h.cacheLookup.mockResolvedValueOnce({
      ...SAMPLE_CACHED_ENABLED,
      audience: 'something-else',
    });
    const token = await h.sign({
      iss: ISSUER,
      sub: 'analytics-pipeline',
      aud: 'analytics-pipeline',
      scope: 'platform:read',
      jti: 'jti-4',
      exp: inFuture(600),
    });

    const req = makeRequest({ authorization: `Bearer ${token}` });
    await expect(h.strategy.validate(req)).rejects.toMatchObject({
      errorCode: 'invalid_audience',
    });
  });

  it('rejects when the bearer jti is on the blocklist', async () => {
    const h = await makeHarness();
    h.cacheLookup.mockResolvedValueOnce(SAMPLE_CACHED_ENABLED);
    h.isBlocked.mockResolvedValueOnce(true);
    const token = await h.sign({
      iss: ISSUER,
      sub: 'analytics-pipeline',
      aud: 'analytics-pipeline',
      scope: 'platform:read',
      jti: 'jti-5',
      exp: inFuture(600),
    });

    const req = makeRequest({ authorization: `Bearer ${token}` });
    await expect(h.strategy.validate(req)).rejects.toMatchObject({
      errorCode: 'token_revoked',
    });
  });

  it('rejects with 003 FR-024a UNAUTHENTICATED envelope when sub is neither a UUID nor a known clientId', async () => {
    const h = await makeHarness();
    h.cacheLookup.mockResolvedValueOnce(null);
    const token = await h.sign({
      iss: ISSUER,
      sub: 'unknown-clientid',
      aud: 'https://alkemio.example.com',
      scope: 'platform:read',
      jti: 'jti-6',
      exp: inFuture(600),
    });

    const req = makeRequest({ authorization: `Bearer ${token}` });
    await expect(h.strategy.validate(req)).rejects.toMatchObject({
      errorCode: 'missing_alkemio_actor_id',
    });
  });

  it('preserves 003 behaviour for user bearers (with alkemio_actor_id, aud on static list)', async () => {
    const h = await makeHarness();
    const token = await h.sign({
      iss: ISSUER,
      sub: 'b5a3a4a0-1234-4321-8765-abcdefabcdef',
      aud: 'https://alkemio.example.com',
      alkemio_actor_id: 'actor-9',
      scope: 'openid',
      jti: 'jti-7',
      exp: inFuture(600),
    });

    const req = makeRequest({ authorization: `Bearer ${token}` });
    await h.strategy.validate(req);
    // Service-principal branch did NOT fire (cache.lookup not called).
    expect(h.cacheLookup).not.toHaveBeenCalled();
    const ub = (
      req as unknown as {
        alkemioBearer?: { alkemio_actor_id: string };
      }
    ).alkemioBearer;
    expect(ub?.alkemio_actor_id).toBe('actor-9');
  });

  it('rejects when no Authorization header is present in a service-client context', async () => {
    const h = await makeHarness();
    const req = makeRequest({});
    const out = await h.strategy.validate(req);
    expect(out).toBeNull();
    expect(h.cacheLookup).not.toHaveBeenCalled();
  });
});
