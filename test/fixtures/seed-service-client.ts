import {
  ServiceClient,
  type ServiceClientStatus,
  type ServiceClientTokenEndpointAuthMethod,
} from '@src/platform-admin/domain/service-clients/entities/service-client.entity';
import { ServiceClientScope } from '@src/platform-admin/domain/service-clients/entities/service-client-scope.entity';
import type { CachedServiceClient } from '@src/platform-admin/domain/service-clients/service-client-cache/service-client-cache.service';
import { randomUUID } from 'crypto';
import {
  exportJWK,
  generateKeyPair,
  type JWK,
  type JWTPayload,
  type JWTVerifyGetKey,
  type KeyLike,
  SignJWT,
} from 'jose';

/**
 * 004 T045 — Service-client test fixture.
 *
 * Provides a single deterministic surface for US1/US3/US5 integration
 * tests that need to exercise the SP admission path WITHOUT touching a
 * live Hydra. Three personas the fixture supports:
 *
 *   1. **In-process integration** (the dominant pattern — see
 *      `test/integration/oidc/bearer-test-harness.ts`): the fixture
 *      mints a JWT off a test-owned keypair whose public side is fed
 *      into `HydraBearerStrategy` via the same `BEARER_JWKS_HANDLE` DI
 *      shape that production uses. The catalogue row is constructed
 *      as a plain `ServiceClient` instance; tests choose to insert it
 *      into a real TypeORM repo (when running with a containerised PG)
 *      or to mock the cache lookup directly. The `CachedServiceClient`
 *      shape returned by `seed.cachedView()` is what the cache would
 *      have returned post-population, ready to drop into a vi.mock.
 *
 *   2. **Live-stack e2e** (Playwright suite — T046): the fixture
 *      additionally exposes `registerWithHydra(adminClient)` which
 *      delegates to `HydraAdminClient` to create the matching
 *      OAuth2Client. The caller passes a real Hydra Admin URL via
 *      `HYDRA_ADMIN_URL` env; we mint the secret via Hydra rather
 *      than a fixed test value. Used by the US1 mint-and-call drill.
 *
 *   3. **US2-aware integration** (post-T054): once the
 *      `registerServiceClient` GraphQL mutation lands, integration
 *      tests SHOULD switch from this fixture to the mutation path for
 *      everything except infra-shape assertions. This file remains the
 *      canonical seam for pre-US2 work and for the US5 cascade-revoke
 *      drill where the test needs to short-circuit catalogue setup.
 */

export interface SeedSpec {
  clientId?: string;
  name?: string;
  ownerUserId?: string;
  createdByUserId?: string;
  description?: string;
  scopes?: string[];
  audience?: string;
  accessTokenLifetimeSeconds?: number;
  tokenEndpointAuthMethod?: ServiceClientTokenEndpointAuthMethod;
  status?: ServiceClientStatus;
}

export interface SeededServiceClient {
  /** The shaped TypeORM row (insert into a repo OR use as a stand-in). */
  row: ServiceClient;
  /** What the cache returns post-population (admission-gate shape). */
  cachedView: () => CachedServiceClient;
  /** The matching join-table rows for `service_client_scope`. */
  scopeRows: ServiceClientScope[];
  /**
   * Mints a JWT shaped as Hydra would on `client_credentials`. The
   * test owns the keypair and can plug the JWKS function into the
   * strategy DI to make the strategy accept this token.
   */
  signToken: (overrides?: Partial<JWTPayload>) => Promise<string>;
  /** JWKS resolver for `HydraBearerStrategy`'s `BEARER_JWKS_HANDLE`. */
  jwks: JWTVerifyGetKey;
  /** Exported JWK for `.well-known/jwks.json` style discovery. */
  jwk: JWK;
  /** Test-owned private key — used to sign forged tokens for negative cases. */
  privateKey: KeyLike;
  /** Hydra-equivalent client_secret (never the real Hydra-issued one). */
  testSecret: string;
}

const DEFAULT_SCOPES = ['platform:read'];
const DEFAULT_TTL_SECONDS = 600;
const DEFAULT_ISSUER = 'http://hydra.example';

/**
 * Build a deterministic service-client fixture.
 *
 * Side-effect-free: returns the shaped data + helpers. Persistence and
 * Hydra-side registration are caller decisions — see the worked examples
 * in `test/integration/sc-008-mint-call-deny.spec.ts` (T042).
 */
export async function seedServiceClient(
  spec: SeedSpec = {}
): Promise<SeededServiceClient> {
  const clientId = spec.clientId ?? 'test-service-client';
  const name = spec.name ?? 'Test Service Client';
  const ownerUserId = spec.ownerUserId ?? randomUUID();
  const createdByUserId = spec.createdByUserId ?? ownerUserId;
  const scopes = spec.scopes ?? DEFAULT_SCOPES;
  const audience = spec.audience ?? clientId;
  const accessTokenLifetimeSeconds =
    spec.accessTokenLifetimeSeconds ?? DEFAULT_TTL_SECONDS;
  const tokenEndpointAuthMethod =
    spec.tokenEndpointAuthMethod ?? 'client_secret_basic';
  const status = spec.status ?? 'enabled';

  const row = Object.assign(new ServiceClient(), {
    clientId,
    name,
    nameNormalised: name.trim().toLowerCase(),
    ownerUserId,
    description: spec.description ?? '',
    audience,
    accessTokenLifetimeSeconds,
    tokenEndpointAuthMethod,
    status,
    createdAt: new Date(),
    createdByUserId,
    lastRotatedAt: null,
    lastStatusChangedAt: null,
    scopes: undefined,
  }) as ServiceClient;

  const scopeRows: ServiceClientScope[] = scopes.map(scopeName =>
    Object.assign(new ServiceClientScope(), {
      clientId,
      scopeName,
      // The created_at on the join row matches DB default.
      createdAt: new Date(),
    })
  );
  row.scopes = scopeRows;

  const { publicKey, privateKey } = await generateKeyPair('RS256', {
    extractable: true,
  });
  const jwk: JWK = { ...(await exportJWK(publicKey)), kid: 'test-kid' };
  const jwks: JWTVerifyGetKey = async () => publicKey as KeyLike;

  const testSecret = `test-secret-${clientId}`;

  const signToken = async (
    overrides: Partial<JWTPayload> = {}
  ): Promise<string> => {
    const now = Math.floor(Date.now() / 1_000);
    const claims: JWTPayload = {
      iss: DEFAULT_ISSUER,
      sub: clientId,
      aud: audience,
      client_id: clientId,
      jti: randomUUID(),
      iat: now,
      exp: now + accessTokenLifetimeSeconds,
      scope: scopes.join(' '),
      ...overrides,
    };
    return new SignJWT(claims as Record<string, unknown>)
      .setProtectedHeader({ alg: 'RS256', kid: 'test-kid' })
      .sign(privateKey);
  };

  return {
    row,
    cachedView: () => ({
      name,
      status,
      scopes: [...scopes],
      audience,
      accessTokenLifetimeSeconds,
      tokenEndpointAuthMethod,
    }),
    scopeRows,
    signToken,
    jwks,
    jwk,
    privateKey: privateKey as KeyLike,
    testSecret,
  };
}
