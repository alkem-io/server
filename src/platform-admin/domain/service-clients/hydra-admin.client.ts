import { Injectable, Logger } from '@nestjs/common';
import { Configuration, OAuth2Api, OAuth2Client } from '@ory/hydra-client';

/**
 * Thin adapter over `@ory/hydra-client` v2 fronting Ory Hydra's Admin API.
 *
 * Auth posture (per spec 004 / tasks.md T022 A1):
 *  - Hydra Admin Service is namespace-internal (k8s ClusterIP, no ingress)
 *    and reachability is gated by NetworkPolicy (T022a). No shared secret
 *    or admin-bearer is layered on top in v1.
 *  - In local-dev compose, `HYDRA_ADMIN_URL=http://hydra:4445` is sufficient.
 *
 * One shared client instance is initialised once in the constructor and
 * reused for the lifetime of the Nest provider.
 */
@Injectable()
export class HydraAdminClient {
  private readonly logger = new Logger(HydraAdminClient.name);
  private readonly oauth2Api: OAuth2Api;
  private readonly basePath: string;

  constructor() {
    this.basePath = process.env.HYDRA_ADMIN_URL ?? 'http://localhost:4445';
    const config = new Configuration({ basePath: this.basePath });
    this.oauth2Api = new OAuth2Api(config);
    this.logger.log(
      `HydraAdminClient initialised against basePath=${this.basePath}`
    );
  }

  /**
   * FR-001 — Registers an OAuth2 client in Hydra for the client_credentials
   * grant. Returns the Hydra-issued plaintext `client_secret` exactly once;
   * callers are responsible for relaying it to the admin via the one-time
   * `ServiceClientSecretReveal` and discarding it thereafter.
   */
  async createOAuth2Client(req: {
    clientId: string;
    scopes: string[];
    audience: string;
    tokenEndpointAuthMethod: 'client_secret_basic' | 'client_secret_post';
    accessTokenLifetimeSeconds: number;
  }): Promise<{ client_secret: string }> {
    const body: OAuth2Client = {
      client_id: req.clientId,
      grant_types: ['client_credentials'],
      response_types: [],
      scope: req.scopes.join(' '),
      audience: [req.audience],
      token_endpoint_auth_method: req.tokenEndpointAuthMethod,
      // Hydra v2.2 token-lifespan field name (per
      // known-divergences §Hydra v2.2 token lifespan field naming):
      // `access_token_strategy` selects opaque vs JWT; per-client TTL
      // ships via the per-grant `*_token_lifespan` ISO-8601 duration.
      // We set both forms (typed slot + flexible map) so the request
      // matches the live admin schema regardless of typings drift.
      access_token_strategy: 'jwt',
    };
    // Per-grant TTL — Hydra accepts ISO-8601 duration strings here.
    (body as Record<string, unknown>)[
      'client_credentials_grant_access_token_lifespan'
    ] = `${req.accessTokenLifetimeSeconds}s`;

    const { data } = await this.oauth2Api.createOAuth2Client({
      oAuth2Client: body,
    });
    if (!data.client_secret) {
      throw new Error(
        `Hydra createOAuth2Client returned no client_secret for clientId=${req.clientId}`
      );
    }
    return { client_secret: data.client_secret };
  }

  /**
   * FR-004 / FR-007 — Removes the Hydra-side OAuth2 client. Used by the
   * BullMQ cascade-revoke worker (T035). Safe to invoke repeatedly: Hydra
   * returns 404 on missing clients which the worker treats as success.
   */
  async deleteOAuth2Client(clientId: string): Promise<void> {
    await this.oauth2Api.deleteOAuth2Client({ id: clientId });
  }

  /**
   * Generic update path used by scope / lifetime / auth-method edits.
   * Caller supplies the partial Hydra `OAuth2Client` shape; we delegate to
   * `setOAuth2Client` (PUT replace-semantics — caller is responsible for
   * supplying the full intended state).
   */
  async updateOAuth2Client(
    clientId: string,
    patch: Partial<OAuth2Client>
  ): Promise<OAuth2Client> {
    const { data } = await this.oauth2Api.setOAuth2Client({
      id: clientId,
      oAuth2Client: { ...patch, client_id: clientId },
    });
    return data;
  }

  /**
   * FR-003 — Atomic secret rotation. Sets `client_secret` to an empty
   * string which instructs Hydra to mint a fresh one; the returned client
   * carries the new plaintext secret in its `client_secret` field.
   */
  async rotateClientSecret(
    clientId: string
  ): Promise<{ client_secret: string }> {
    const { data } = await this.oauth2Api.setOAuth2Client({
      id: clientId,
      oAuth2Client: {
        client_id: clientId,
        client_secret: '',
      } as OAuth2Client,
    });
    if (!data.client_secret) {
      throw new Error(
        `Hydra rotateClientSecret returned no client_secret for clientId=${clientId}`
      );
    }
    return { client_secret: data.client_secret };
  }

  /**
   * FR-011a — RFC 7009 token revocation. Propagates a single bearer's
   * revocation to Hydra so the introspection endpoint reports it inactive
   * for the remainder of its lifetime. The blocklist tombstone (T030)
   * carries cross-replica enforcement in the meantime.
   *
   * The revocation endpoint is on the public surface (`/oauth2/revoke`),
   * not the admin surface — but we expose it through this adapter because
   * its caller (the cache layer) already holds the client_id and reads
   * `HYDRA_PUBLIC_URL` consistently with `HYDRA_ADMIN_URL`. We send the
   * form-encoded body per RFC 7009 §2.1 with HTTP Basic auth.
   */
  async revokeBearerRfc7009(
    token: string,
    clientId: string,
    clientSecret: string
  ): Promise<void> {
    const publicBase = process.env.HYDRA_PUBLIC_URL ?? 'http://localhost:4444';
    const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString(
      'base64'
    );
    const body = new URLSearchParams({ token });
    const res = await fetch(`${publicBase}/oauth2/revoke`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${basicAuth}`,
      },
      body: body.toString(),
    });
    // RFC 7009 §2.2: the server responds 200 regardless of whether the
    // token was active. 503 / 5xx are retryable; 4xx other than 401
    // signal a client-side bug and should surface.
    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      throw new Error(
        `Hydra /oauth2/revoke returned ${res.status} for clientId=${clientId}: ${errBody}`
      );
    }
  }
}
