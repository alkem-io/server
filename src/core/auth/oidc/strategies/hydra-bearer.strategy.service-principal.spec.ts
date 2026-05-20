import type { ActorContextService } from '@core/actor-context/actor.context.service';
import type { AuthenticationService } from '@core/authentication/authentication.service';
import type { RevokedBearerBlocklistService } from '@src/platform-admin/domain/service-clients/service-client-cache/revoked-bearer-blocklist.service';
import type {
  CachedServiceClient,
  ServiceClientCacheService,
} from '@src/platform-admin/domain/service-clients/service-client-cache/service-client-cache.service';
import type { Request } from 'express';
import { type JWTVerifyGetKey } from 'jose';
import { type Mock, vi } from 'vitest';

// 004 T037 — `jwtVerify` is the seam we mock at; the strategy reads its
// `payload` from the result. The mock is hoisted by vitest so the
// strategy module sees the mocked symbol when imported.
vi.mock('jose', async () => {
  const actual = await vi.importActual<typeof import('jose')>('jose');
  return {
    ...actual,
    jwtVerify: vi.fn(),
  };
});

import { jwtVerify } from 'jose';
import { BearerValidationError } from './auth.errors';
import {
  HydraBearerStrategy,
  type ServicePrincipalContext,
} from './hydra-bearer.strategy';

/**
 * 004 T037 — Contract tests for the service-principal branch of
 * `HydraBearerStrategy` (FR-013, FR-014, FR-015, FR-016, FR-017).
 *
 * Drives T032 + T033. Mocks `jose.jwtVerify` so we can inject arbitrary
 * payload shapes; the strategy's audience prefilter is intentionally
 * skipped now (T032 lets jose verify only signature/iss/exp, then
 * re-checks audience against the cache + static list).
 *
 * The 003 FR-024a UNAUTHENTICATED rejection envelope is represented by
 * `BearerValidationError('missing_alkemio_actor_id', ...)` being thrown
 * — the interceptor mapper turns that into the GraphQL UNAUTHENTICATED
 * response.
 */

const STATIC_ALLOW_LIST = ['https://alkemio.example.com'];
const ISSUER = 'https://hydra.example.com/';

const SAMPLE_CACHED_ENABLED: CachedServiceClient = {
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
  jwt: Mock;
}

function makeHarness(): Harness {
  const cacheLookup = vi.fn();
  const isBlocked = vi.fn().mockResolvedValue(false);
  const cache: Partial<ServiceClientCacheService> = {
    lookup: cacheLookup,
  };
  const blocklist: Partial<RevokedBearerBlocklistService> = {
    isBlocked,
  };

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
  return {
    headers,
  } as unknown as Request;
}

function jwtPayload(p: Record<string, unknown>) {
  return {
    payload: p,
    protectedHeader: { alg: 'RS256' },
  } as unknown as Awaited<ReturnType<typeof jwtVerify>>;
}

describe('HydraBearerStrategy — service-principal branch (T037)', () => {
  it('admits a bearer without alkemio_actor_id when sub matches an enabled clientId', async () => {
    const h = makeHarness();
    h.cacheLookup.mockResolvedValueOnce(SAMPLE_CACHED_ENABLED);
    h.jwt.mockResolvedValueOnce(
      jwtPayload({
        sub: 'analytics-pipeline',
        aud: 'analytics-pipeline',
        scope: 'platform:read analytics:read',
        jti: 'jti-1',
      })
    );

    const req = makeRequest({ authorization: 'Bearer xxx' });
    const out = await h.strategy.validate(req);

    // Service-principal path returns null from `validate` (no ActorContext)
    // and stashes the principal on the request.
    expect(out).toBeNull();
    const principal = (
      req as unknown as { servicePrincipal?: ServicePrincipalContext }
    ).servicePrincipal;
    expect(principal).toEqual({
      kind: 'service-principal',
      clientId: 'analytics-pipeline',
      name: 'analytics-pipeline',
      grantedScopes: ['platform:read', 'analytics:read'],
    });
  });

  it('intersects bearer.scope with cached configured set', async () => {
    const h = makeHarness();
    h.cacheLookup.mockResolvedValueOnce({
      ...SAMPLE_CACHED_ENABLED,
      scopes: ['a', 'c'],
    });
    h.jwt.mockResolvedValueOnce(
      jwtPayload({
        sub: 'analytics-pipeline',
        aud: 'analytics-pipeline',
        scope: 'a b c',
        jti: 'jti-2',
      })
    );

    const req = makeRequest({ authorization: 'Bearer xxx' });
    await h.strategy.validate(req);
    const principal = (
      req as unknown as { servicePrincipal?: ServicePrincipalContext }
    ).servicePrincipal;
    expect(principal?.grantedScopes).toEqual(['a', 'c']);
  });

  it('rejects when the cache reports status: disabled', async () => {
    const h = makeHarness();
    h.cacheLookup.mockResolvedValue(SAMPLE_CACHED_DISABLED);
    h.jwt.mockResolvedValue(
      jwtPayload({
        sub: 'analytics-pipeline',
        aud: 'analytics-pipeline',
        scope: 'platform:read',
        jti: 'jti-3',
      })
    );

    const req = makeRequest({ authorization: 'Bearer xxx' });
    const rejected = h.strategy.validate(req);
    await expect(rejected).rejects.toBeInstanceOf(BearerValidationError);
    await expect(rejected).rejects.toMatchObject({
      errorCode: 'service_client_disabled',
    });
  });

  it('rejects when aud is outside the allow-list (cached aud mismatch)', async () => {
    const h = makeHarness();
    h.cacheLookup.mockResolvedValueOnce({
      ...SAMPLE_CACHED_ENABLED,
      audience: 'something-else', // cache says aud should be different
    });
    h.jwt.mockResolvedValueOnce(
      jwtPayload({
        sub: 'analytics-pipeline',
        aud: 'analytics-pipeline',
        scope: 'platform:read',
        jti: 'jti-4',
      })
    );

    const req = makeRequest({ authorization: 'Bearer xxx' });
    await expect(h.strategy.validate(req)).rejects.toMatchObject({
      errorCode: 'invalid_audience',
    });
  });

  it('rejects when the bearer jti is on the blocklist', async () => {
    const h = makeHarness();
    h.cacheLookup.mockResolvedValueOnce(SAMPLE_CACHED_ENABLED);
    h.isBlocked.mockResolvedValueOnce(true);
    h.jwt.mockResolvedValueOnce(
      jwtPayload({
        sub: 'analytics-pipeline',
        aud: 'analytics-pipeline',
        scope: 'platform:read',
        jti: 'jti-5',
      })
    );

    const req = makeRequest({ authorization: 'Bearer xxx' });
    await expect(h.strategy.validate(req)).rejects.toMatchObject({
      errorCode: 'token_revoked',
    });
  });

  it('rejects with 003 FR-024a UNAUTHENTICATED envelope when sub is neither a UUID nor a known clientId', async () => {
    // sub matches the regex shape but cache resolves to null (no
    // catalogue row) AND no alkemio_actor_id claim ⇒ fall through to
    // the 003 missing-claim rejection.
    const h = makeHarness();
    h.cacheLookup.mockResolvedValueOnce(null);
    h.jwt.mockResolvedValueOnce(
      jwtPayload({
        sub: 'unknown-clientid',
        aud: 'https://alkemio.example.com',
        scope: 'platform:read',
      })
    );

    const req = makeRequest({ authorization: 'Bearer xxx' });
    await expect(h.strategy.validate(req)).rejects.toMatchObject({
      errorCode: 'missing_alkemio_actor_id',
    });
  });

  it('preserves 003 behaviour for user bearers (with alkemio_actor_id, aud on static list)', async () => {
    const h = makeHarness();
    h.jwt.mockResolvedValueOnce(
      jwtPayload({
        sub: 'b5a3a4a0-1234-4321-8765-abcdefabcdef',
        aud: 'https://alkemio.example.com',
        alkemio_actor_id: 'actor-9',
        scope: 'openid',
      })
    );

    const req = makeRequest({ authorization: 'Bearer xxx' });
    await h.strategy.validate(req);
    // Service-principal branch did NOT fire (cache.lookup not called).
    expect(h.cacheLookup).not.toHaveBeenCalled();
    // User-bearer context stashed.
    const ub = (
      req as unknown as {
        alkemioBearer?: { alkemio_actor_id: string };
      }
    ).alkemioBearer;
    expect(ub?.alkemio_actor_id).toBe('actor-9');
  });

  it('rejects when no Authorization header is present in a service-client context', async () => {
    const h = makeHarness();
    const req = makeRequest({});
    const out = await h.strategy.validate(req);
    expect(out).toBeNull();
    expect(h.cacheLookup).not.toHaveBeenCalled();
  });
});
