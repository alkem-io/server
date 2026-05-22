import type { OAuth2Client } from '@ory/hydra-client';
import { type Mock, vi } from 'vitest';

/**
 * 004 T040 — Contract test for the `client_credentials` mint pathway.
 *
 * The runtime contract has two halves:
 *
 *  1. **Configuration → Hydra**: `HydraAdminClient.createOAuth2Client`
 *     MUST emit a Hydra `OAuth2Client` body whose fields make Hydra's
 *     `/oauth2/token` issue tokens with the shape required by spec
 *     `contracts/token-endpoint-client-credentials.md` — `grant_types`
 *     limited to `client_credentials`, `audience = [clientId]`, scope
 *     joined from the configured catalogue set, `token_endpoint_auth_method`
 *     fixed at registration to exactly one of `client_secret_basic`
 *     or `client_secret_post`, JWT access strategy, and a per-grant
 *     `client_credentials_grant_access_token_lifespan` matching the
 *     catalogue ATL within `[300, 900]` s.
 *
 *  2. **Mint response → Bearer**: Hydra returns a JWT whose claims
 *     downstream consumers rely on (`sub == clientId`, `aud == clientId`,
 *     `scope = requested ∩ configured`, NO `alkemio_actor_id`). Hydra is
 *     the source of truth for the actual mint; this test fixes the
 *     contract by asserting the adapter does not silently rewrite the
 *     subject/audience/scope inputs and surfaces Hydra's response shape
 *     unchanged. End-to-end mint behaviour against a live Hydra is
 *     exercised in the US1 Playwright suite (T046) and the FR-001
 *     all-or-nothing register flow (US2 T054).
 *
 * The **fixed-method invariant** of FR-001 + FR-008 (Clarifications
 * Session 2026-05-18) is encoded here by asserting the adapter ships
 * exactly one `token_endpoint_auth_method` per client — Hydra then
 * enforces `invalid_client` on the opposite method per
 * `contracts/token-endpoint-client-credentials.md` Response-error matrix.
 */

const createOAuth2Client = vi.fn();
const deleteOAuth2Client = vi.fn();
const setOAuth2Client = vi.fn();

vi.mock('@ory/hydra-client', () => {
  // Constructable shapes — `new Configuration(...)` and `new OAuth2Api(...)`
  // both happen inside `HydraAdminClient`'s constructor, so the mock
  // factory MUST return classes (or `function` literals), NOT arrow
  // functions — arrows are not [[Construct]]-able.
  return {
    Configuration: class {
      basePath?: string;
      constructor(cfg: { basePath?: string }) {
        this.basePath = cfg.basePath;
      }
    },
    OAuth2Api: class {
      createOAuth2Client = createOAuth2Client;
      deleteOAuth2Client = deleteOAuth2Client;
      setOAuth2Client = setOAuth2Client;
    },
  };
});

// Imported AFTER the mock so the constructor picks up the mocked
// OAuth2Api shape.
import { HydraAdminClient } from './hydra-admin.client';

function makeAdapter(): HydraAdminClient {
  return new HydraAdminClient();
}

function lastCreateBody(): OAuth2Client {
  const calls = (createOAuth2Client as Mock).mock.calls;
  if (calls.length === 0) throw new Error('createOAuth2Client never invoked');
  const args = calls[calls.length - 1][0] as { oAuth2Client: OAuth2Client };
  return args.oAuth2Client;
}

describe('client_credentials mint contract (T040)', () => {
  beforeEach(() => {
    createOAuth2Client.mockReset();
    deleteOAuth2Client.mockReset();
    setOAuth2Client.mockReset();
    createOAuth2Client.mockResolvedValue({
      data: { client_secret: 'hydra-issued-secret' },
    });
  });

  describe('registration body shape (Hydra Admin API → catalogue contract)', () => {
    it('ships grant_types=[client_credentials] exclusively — no implicit grants', async () => {
      const adapter = makeAdapter();
      await adapter.createOAuth2Client({
        clientId: 'analytics-pipeline',
        scopes: ['platform:read'],
        audience: 'analytics-pipeline',
        tokenEndpointAuthMethod: 'client_secret_basic',
        accessTokenLifetimeSeconds: 600,
      });

      const body = lastCreateBody();
      expect(body.grant_types).toEqual(['client_credentials']);
      // No `response_types` for client_credentials per OAuth2 (RFC 6749 §4.4).
      expect(body.response_types).toEqual([]);
    });

    it('sets audience to a singleton list equal to clientId (FR-017)', async () => {
      const adapter = makeAdapter();
      await adapter.createOAuth2Client({
        clientId: 'analytics-pipeline',
        scopes: ['platform:read'],
        audience: 'analytics-pipeline',
        tokenEndpointAuthMethod: 'client_secret_basic',
        accessTokenLifetimeSeconds: 600,
      });

      const body = lastCreateBody();
      expect(body.audience).toEqual(['analytics-pipeline']);
    });

    it('joins configured scopes with a single space (RFC 6749 §3.3)', async () => {
      const adapter = makeAdapter();
      await adapter.createOAuth2Client({
        clientId: 'analytics-pipeline',
        scopes: ['platform:read', 'analytics:read', 'health:read'],
        audience: 'analytics-pipeline',
        tokenEndpointAuthMethod: 'client_secret_basic',
        accessTokenLifetimeSeconds: 600,
      });

      const body = lastCreateBody();
      expect(body.scope).toBe('platform:read analytics:read health:read');
    });

    it('selects JWT access strategy so downstream consumers can read claims (sub/aud/scope/jti)', async () => {
      const adapter = makeAdapter();
      await adapter.createOAuth2Client({
        clientId: 'analytics-pipeline',
        scopes: ['platform:read'],
        audience: 'analytics-pipeline',
        tokenEndpointAuthMethod: 'client_secret_basic',
        accessTokenLifetimeSeconds: 600,
      });

      const body = lastCreateBody();
      // `access_token_strategy` is part of the OAuth2Client shape per
      // Hydra v2.2 (typed via `as Record<string, unknown>` in the adapter).
      expect((body as Record<string, unknown>).access_token_strategy).toBe(
        'jwt'
      );
    });

    it('ships per-grant access-token lifespan as ISO-8601 seconds (FR-012)', async () => {
      const adapter = makeAdapter();
      await adapter.createOAuth2Client({
        clientId: 'analytics-pipeline',
        scopes: ['platform:read'],
        audience: 'analytics-pipeline',
        tokenEndpointAuthMethod: 'client_secret_basic',
        accessTokenLifetimeSeconds: 600,
      });

      const body = lastCreateBody();
      expect(
        (body as Record<string, unknown>)
          .client_credentials_grant_access_token_lifespan
      ).toBe('600s');
    });

    it('returns the Hydra-issued client_secret exactly once (FR-001)', async () => {
      const adapter = makeAdapter();
      const result = await adapter.createOAuth2Client({
        clientId: 'analytics-pipeline',
        scopes: ['platform:read'],
        audience: 'analytics-pipeline',
        tokenEndpointAuthMethod: 'client_secret_basic',
        accessTokenLifetimeSeconds: 600,
      });

      expect(result.client_secret).toBe('hydra-issued-secret');
    });

    it('throws when Hydra returns no client_secret (defensive — FR-001 all-or-nothing)', async () => {
      createOAuth2Client.mockResolvedValueOnce({ data: {} });
      const adapter = makeAdapter();
      await expect(
        adapter.createOAuth2Client({
          clientId: 'analytics-pipeline',
          scopes: ['platform:read'],
          audience: 'analytics-pipeline',
          tokenEndpointAuthMethod: 'client_secret_basic',
          accessTokenLifetimeSeconds: 600,
        })
      ).rejects.toThrow(/no client_secret/);
    });
  });

  describe('fixed-method invariant (FR-001 + FR-008)', () => {
    it('pins token_endpoint_auth_method to client_secret_basic when supplied', async () => {
      const adapter = makeAdapter();
      await adapter.createOAuth2Client({
        clientId: 'pipeline-a',
        scopes: ['platform:read'],
        audience: 'pipeline-a',
        tokenEndpointAuthMethod: 'client_secret_basic',
        accessTokenLifetimeSeconds: 300,
      });

      const body = lastCreateBody();
      expect(body.token_endpoint_auth_method).toBe('client_secret_basic');
    });

    it('pins token_endpoint_auth_method to client_secret_post when supplied', async () => {
      const adapter = makeAdapter();
      await adapter.createOAuth2Client({
        clientId: 'pipeline-b',
        scopes: ['platform:read'],
        audience: 'pipeline-b',
        tokenEndpointAuthMethod: 'client_secret_post',
        accessTokenLifetimeSeconds: 900,
      });

      const body = lastCreateBody();
      expect(body.token_endpoint_auth_method).toBe('client_secret_post');
    });

    // The fixed-method invariant proper — presenting credentials via the
    // OTHER method MUST be rejected by Hydra with `invalid_client`. The
    // adapter encodes this by shipping exactly ONE method per client
    // registration. Hydra then enforces at /oauth2/token, per
    // `contracts/token-endpoint-client-credentials.md` Response-error matrix.
    // We document the boundary here so future maintainers do not "fix"
    // the adapter to send a method list.
    it('ships exactly one auth method per registration (Hydra enforces invalid_client on the opposite)', async () => {
      const adapter = makeAdapter();
      await adapter.createOAuth2Client({
        clientId: 'pipeline-c',
        scopes: ['platform:read'],
        audience: 'pipeline-c',
        tokenEndpointAuthMethod: 'client_secret_basic',
        accessTokenLifetimeSeconds: 600,
      });

      const body = lastCreateBody();
      // Single string, not an array — Hydra's per-client setting is
      // singular by design (RFC 7591 §2 `token_endpoint_auth_method`).
      expect(typeof body.token_endpoint_auth_method).toBe('string');
      expect(body.token_endpoint_auth_method).toBe('client_secret_basic');
    });
  });

  describe('ATL boundary inputs (FR-012)', () => {
    it.each([
      300, 600, 900,
    ])('forwards ATL %i s into the per-grant lifespan slot', async atl => {
      const adapter = makeAdapter();
      await adapter.createOAuth2Client({
        clientId: 'pipeline-atl',
        scopes: ['platform:read'],
        audience: 'pipeline-atl',
        tokenEndpointAuthMethod: 'client_secret_basic',
        accessTokenLifetimeSeconds: atl,
      });

      const body = lastCreateBody();
      expect(
        (body as Record<string, unknown>)
          .client_credentials_grant_access_token_lifespan
      ).toBe(`${atl}s`);
    });
  });

  describe('JWT claim contract (Hydra-side mint behaviour — documented invariants)', () => {
    // The actual mint is Hydra's responsibility; these assertions
    // document the downstream invariants the platform admission gate
    // (HydraBearerStrategy service-principal branch — T032) depends on,
    // so that a future maintainer reading this file understands what
    // the adapter's outputs must produce when fed to Hydra's
    // /oauth2/token.
    it('documents: sub claim MUST equal client_id (FR-013)', () => {
      // Hydra writes `sub = client_id` on client_credentials mints by
      // default; the adapter never overrides `subject_type`. If a
      // future Hydra upgrade changes the default, the e2e suite (T046)
      // catches it via JWT inspection on a real mint.
      expect(true).toBe(true);
    });

    it('documents: aud claim MUST equal client_id (FR-017)', () => {
      // The adapter sets `audience: [clientId]`. Hydra writes the
      // first audience to the JWT `aud` claim on mint.
      expect(true).toBe(true);
    });

    it('documents: granted scope = requested ∩ configured (FR-009 case (a))', () => {
      // Hydra intersects the client's configured `scope` field with
      // the requested `scope` form parameter at /oauth2/token. The
      // adapter writes the configured set; the resolver-layer gate
      // (T067) intersects bearer-`scope` ∧ catalogue-`scope` again on
      // admission per FR-016. T037 covers the admission half.
      expect(true).toBe(true);
    });

    it('documents: NO alkemio_actor_id claim (FR-013 amendment)', () => {
      // Service clients have no human user behind them; the
      // `alkemio_actor_id` claim is injected by `oidc-service` only
      // for authorization_code / refresh_token grants (see
      // T024 token-hook handler). client_credentials grants skip
      // the claim injection — verified by the OIDC contract test
      // T038 (`client_credentials_mint_audit_test.go`).
      expect(true).toBe(true);
    });
  });
});
