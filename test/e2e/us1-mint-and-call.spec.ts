import { randomBytes } from 'crypto';
import { Client as PgClient } from 'pg';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

/**
 * 004 T046 — US1 mint-and-call live-stack drill.
 *
 * Live-stack counterpart of T042 (in-process integration). T042 mints
 * a JWT off a test-owned keypair and exercises the SP admission path
 * without touching Hydra; this suite drives the *real* Hydra
 * `/oauth2/token` round-trip + the running `alkemio-server` and
 * asserts the five US1 acceptance scenarios end-to-end:
 *
 *   1. Registered client → mint → JWT carries sub == aud == client_id,
 *      scope = requested ∩ configured, NO `alkemio_actor_id`.
 *   2. In-scope bearer → 200 on GraphQL (shape matches user-auth call).
 *   3. Out-of-scope bearer → FORBIDDEN_SCOPE (distinguishable from
 *      UNAUTHENTICATED — FR-016).
 *   4. Expired bearer → rejected; client re-mints via held credentials
 *      (no refresh path — FR-011).
 *   5. Unregistered creds → standard OAuth2 error (`invalid_client`),
 *      no token minted.
 *
 * Stack stays on vitest + supertest (matching the rest of the suite).
 * The suite is **opt-in** via `ALKEMIO_E2E=1` so the default CI run
 * (which has no live Hydra) doesn't pick it up.
 *
 * Run locally:
 *   docker compose -f quickstart-services.yml --env-file .env.docker \
 *     up -d postgres redis hydra-migrate hydra hydra-client-setup oidc-service
 *   pnpm run migration:run
 *   pnpm start &
 *   ALKEMIO_E2E=1 pnpm test -- test/e2e/us1-mint-and-call.spec.ts
 *
 * Env overrides (defaults match `quickstart-services.yml`):
 *   HYDRA_PUBLIC_URL         — Hydra OAuth2 endpoint   (default http://localhost:3000)
 *   HYDRA_ADMIN_URL          — Hydra Admin REST        (default http://localhost:4445)
 *   ALKEMIO_SERVER_URL       — GraphQL host             (default http://localhost:4000)
 *   E2E_PG_CONNECTION_STRING — direct PG for fixture    (default postgres://alkemio:alkemio@localhost:5435/alkemio)
 *
 * Seeding deviates from T045 fixture (in-process TypeORM): an external
 * suite cannot import the seeder without booting the Nest app, so seed
 * runs talk directly to:
 *   - Hydra Admin REST (POST /admin/clients) to create the OAuth2Client
 *     and capture the Hydra-issued plaintext secret.
 *   - PostgreSQL (pg client) to insert the `service_client` +
 *     `service_client_scope` catalogue rows that the FR-014 admission
 *     cache reads through.
 *
 * Once US2's `registerServiceClient` mutation lands (T054/T056), this
 * suite SHOULD switch to the mutation path; the direct-seed branch then
 * becomes a test-only escape hatch for `disabled`-from-start scenarios.
 */

const E2E_ENABLED = process.env.ALKEMIO_E2E === '1';
const describeE2E = E2E_ENABLED ? describe : describe.skip;

const HYDRA_PUBLIC_URL =
  process.env.HYDRA_PUBLIC_URL ?? 'http://localhost:3000';
const HYDRA_ADMIN_URL = process.env.HYDRA_ADMIN_URL ?? 'http://localhost:4445';
const ALKEMIO_SERVER_URL =
  process.env.ALKEMIO_SERVER_URL ?? 'http://localhost:4000';
const PG_DSN =
  process.env.E2E_PG_CONNECTION_STRING ??
  'postgres://alkemio:alkemio@localhost:5435/alkemio';
const ATL_SECONDS = 300; // floor — short TTL so scenario #4 doesn't drag

interface SeededClient {
  clientId: string;
  clientSecret: string;
  ownerUserId: string;
}

async function pickAnyExistingUserId(pg: PgClient): Promise<string> {
  const result = await pg.query<{ id: string }>(
    'SELECT id FROM "user" LIMIT 1'
  );
  if (result.rowCount === 0) {
    throw new Error(
      'No rows in "user" table — e2e expects at least one platform user to own the test service client. Seed a user via the platform bootstrap before running.'
    );
  }
  return result.rows[0]!.id;
}

async function createHydraClient(
  clientId: string,
  scopes: string[]
): Promise<string> {
  const body = {
    client_id: clientId,
    grant_types: ['client_credentials'],
    response_types: [],
    scope: scopes.join(' '),
    audience: [clientId],
    token_endpoint_auth_method: 'client_secret_basic',
    access_token_strategy: 'jwt',
    client_credentials_grant_access_token_lifespan: `${ATL_SECONDS}s`,
  };
  const res = await fetch(`${HYDRA_ADMIN_URL}/admin/clients`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(
      `Hydra Admin POST /admin/clients failed: ${res.status} ${await res.text()}`
    );
  }
  const json = (await res.json()) as { client_secret?: string };
  if (!json.client_secret) {
    throw new Error('Hydra Admin response missing `client_secret`.');
  }
  return json.client_secret;
}

async function deleteHydraClient(clientId: string): Promise<void> {
  await fetch(`${HYDRA_ADMIN_URL}/admin/clients/${clientId}`, {
    method: 'DELETE',
  });
}

async function seedCatalogueRow(
  pg: PgClient,
  clientId: string,
  ownerUserId: string,
  scopes: string[]
): Promise<void> {
  await pg.query(
    `INSERT INTO service_client
       (client_id, name, owner_user_id, created_by_user_id, description,
        audience, access_token_lifetime_seconds,
        token_endpoint_auth_method, status)
     VALUES ($1, $2, $3, $3, '', $1, $4, 'client_secret_basic', 'enabled')`,
    [clientId, `e2e:${clientId}`, ownerUserId, ATL_SECONDS]
  );
  for (const scope of scopes) {
    await pg.query(
      `INSERT INTO service_client_scope (client_id, scope_name)
       VALUES ($1, $2)`,
      [clientId, scope]
    );
  }
}

async function tearDownCatalogueRow(
  pg: PgClient,
  clientId: string
): Promise<void> {
  await pg.query(`DELETE FROM service_client_scope WHERE client_id = $1`, [
    clientId,
  ]);
  await pg.query(`DELETE FROM service_client WHERE client_id = $1`, [clientId]);
}

async function seedServiceClient(
  pg: PgClient,
  scopes: string[]
): Promise<SeededClient> {
  const clientId = `e2e-us1-${randomBytes(4).toString('hex')}`;
  const ownerUserId = await pickAnyExistingUserId(pg);
  const clientSecret = await createHydraClient(clientId, scopes);
  try {
    await seedCatalogueRow(pg, clientId, ownerUserId, scopes);
  } catch (err) {
    await deleteHydraClient(clientId);
    throw err;
  }
  return { clientId, clientSecret, ownerUserId };
}

interface TokenResponse {
  access_token?: string;
  token_type?: string;
  expires_in?: number;
  scope?: string;
  error?: string;
  error_description?: string;
}

async function mintToken(
  clientId: string,
  clientSecret: string,
  requestedScopes: string[]
): Promise<TokenResponse> {
  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString(
    'base64'
  );
  const params = new URLSearchParams({
    grant_type: 'client_credentials',
    scope: requestedScopes.join(' '),
  });
  const res = await fetch(`${HYDRA_PUBLIC_URL}/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basicAuth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });
  return (await res.json()) as TokenResponse;
}

function decodeJwtPayload(jwt: string): Record<string, unknown> {
  const [, payloadB64] = jwt.split('.');
  if (!payloadB64) throw new Error('not a JWT — no payload segment');
  return JSON.parse(
    Buffer.from(payloadB64, 'base64url').toString('utf8')
  ) as Record<string, unknown>;
}

describeE2E('US1 — mint-and-call live drill (T046, SC-008 slice)', () => {
  let pg: PgClient;
  let seeded: SeededClient;
  const configuredScopes = ['platform:read'];

  beforeAll(async () => {
    pg = new PgClient({ connectionString: PG_DSN });
    await pg.connect();
    seeded = await seedServiceClient(pg, configuredScopes);
  }, 60_000);

  afterAll(async () => {
    if (pg && seeded) {
      await tearDownCatalogueRow(pg, seeded.clientId).catch(() => {});
      await deleteHydraClient(seeded.clientId).catch(() => {});
      await pg.end();
    }
  });

  it('scenario 1 — token payload identifies the client, not a user', async () => {
    const token = await mintToken(
      seeded.clientId,
      seeded.clientSecret,
      configuredScopes
    );
    expect(token.error).toBeUndefined();
    expect(token.access_token).toBeTruthy();

    const payload = decodeJwtPayload(token.access_token!);
    expect(payload.sub).toBe(seeded.clientId);
    expect(payload.client_id).toBe(seeded.clientId);
    // Hydra emits `aud` as either an array or a string; both forms admit
    // exactly the registered audience (= client_id) for this grant.
    const aud = payload.aud;
    if (Array.isArray(aud)) {
      expect(aud).toContain(seeded.clientId);
    } else {
      expect(aud).toBe(seeded.clientId);
    }
    expect(payload.scope).toBe('platform:read');
    expect(payload.alkemio_actor_id).toBeUndefined();
  });

  it('scenario 2 — in-scope bearer admitted on GraphQL', async () => {
    const token = await mintToken(
      seeded.clientId,
      seeded.clientSecret,
      configuredScopes
    );
    expect(token.access_token).toBeTruthy();

    const res = await request(ALKEMIO_SERVER_URL)
      .post('/api/private/graphql')
      .set('Authorization', `Bearer ${token.access_token!}`)
      .send({ query: '{ platform { id } }' });

    expect(res.status).toBe(200);
    const codes = (
      (res.body.errors ?? []) as Array<{
        extensions?: { code?: string };
      }>
    ).map(e => e.extensions?.code);
    expect(codes).not.toContain('UNAUTHENTICATED');
    expect(codes).not.toContain('FORBIDDEN_SCOPE');
  });

  it('scenario 3 — out-of-scope bearer denied distinguishably (FR-016)', async () => {
    // Hydra silently drops `platform:write` since the client wasn't
    // registered for it — bearer's effective scope stays `platform:read`.
    // Resolver-level guard on a `platform:write` op then denies with
    // FORBIDDEN_SCOPE (FR-015 + FR-016), shape distinguishable from
    // UNAUTHENTICATED.
    const token = await mintToken(seeded.clientId, seeded.clientSecret, [
      'platform:write',
    ]);
    expect(token.access_token).toBeTruthy();

    const res = await request(ALKEMIO_SERVER_URL)
      .post('/api/private/graphql')
      .set('Authorization', `Bearer ${token.access_token!}`)
      .send({
        query: 'mutation { createSpace(spaceData: { nameID: "x" }) { id } }',
      });

    const codes = (
      (res.body.errors ?? []) as Array<{
        extensions?: { code?: string };
      }>
    ).map(e => e.extensions?.code);
    expect(codes).toContain('FORBIDDEN_SCOPE');
    expect(codes).not.toContain('UNAUTHENTICATED');
  });

  it(
    'scenario 4 — expired bearer rejected, client re-mints with held creds (no refresh path)',
    async () => {
      const token = await mintToken(
        seeded.clientId,
        seeded.clientSecret,
        configuredScopes
      );
      expect(token.access_token).toBeTruthy();

      // Wait past the ATL window. Cap at ATL+15s for Hydra clock-skew tolerance.
      await new Promise(resolve =>
        setTimeout(resolve, (ATL_SECONDS + 15) * 1000)
      );

      const stale = await request(ALKEMIO_SERVER_URL)
        .post('/api/private/graphql')
        .set('Authorization', `Bearer ${token.access_token!}`)
        .send({ query: '{ platform { id } }' });
      const staleCodes = (
        (stale.body.errors ?? []) as Array<{
          extensions?: { code?: string };
        }>
      ).map(e => e.extensions?.code);
      // Expired bearer routes through the existing 003 UNAUTHENTICATED
      // envelope — the SP branch shares jose-layer rejection with the
      // user-auth branch (see T044 deferred note on `bearer_expired`).
      expect(
        staleCodes.includes('UNAUTHENTICATED') || stale.status === 401
      ).toBe(true);

      // Re-mint with the SAME held credentials — no refresh token in play.
      const fresh = await mintToken(
        seeded.clientId,
        seeded.clientSecret,
        configuredScopes
      );
      expect(fresh.access_token).toBeTruthy();
      expect(fresh.access_token).not.toBe(token.access_token);
    },
    (ATL_SECONDS + 60) * 1000
  );

  it('scenario 5 — unregistered credentials rejected with invalid_client', async () => {
    const unknownId = `e2e-unknown-${randomBytes(4).toString('hex')}`;
    const res = await mintToken(unknownId, 'never-issued-secret', [
      'platform:read',
    ]);
    expect(res.access_token).toBeUndefined();
    expect(res.error).toBe('invalid_client');
  });

  it('post-condition — no cookie ever set, no session created on the SP path', async () => {
    const token = await mintToken(
      seeded.clientId,
      seeded.clientSecret,
      configuredScopes
    );
    const res = await request(ALKEMIO_SERVER_URL)
      .post('/api/private/graphql')
      .set('Authorization', `Bearer ${token.access_token!}`)
      .send({ query: '{ platform { id } }' });
    expect(res.headers['set-cookie']).toBeUndefined();
  });
});
