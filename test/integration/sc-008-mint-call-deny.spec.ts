import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  createSpHarness,
  findAuditEvents,
  type SpHarness,
} from './service-clients/sp-test-harness';

/**
 * 004 T042 — SC-008 mint → call → deny integration drill (US1 MVP slice).
 *
 * Exercises the full SP admission chain end-to-end in-process:
 *   1. Seed a service client with `platform:read` configured (T045 fixture).
 *   2. Mint a JWT off the fixture's keypair (analogue of Hydra
 *      `/oauth2/token` returning a token with `sub=client_id`,
 *      `aud=client_id`, `scope="platform:read"`, NO `alkemio_actor_id`).
 *   3. Present the bearer at `/api/private/graphql`:
 *      a. **in-scope** `platform:read` operation → 200 + FR-019 `request`
 *         row with `outcome:"success"` + `granted_scope` populated.
 *      b. **out-of-scope** `platform:write` operation → 403
 *         (`FORBIDDEN_SCOPE`) distinguishable from `UNAUTHENTICATED` +
 *         FR-022 `scope_denial` row with `missing_scope` + zero `request`
 *         rows for the same `request_id` (single-emission rule, T044).
 *   4. Assert audit attribution: every emitted row carries
 *      `actor_type:"service-client"` and `service_client_id` matching
 *      the registered `clientId` — no `alkemio_actor_id` ever attaches.
 *
 * Hydra-side mint (the real `/oauth2/token` round-trip) is exercised
 * by the Playwright suite (T046) against a live local Hydra; this
 * integration drill stays in-process so it runs in every CI job
 * regardless of whether the Hydra container is up.
 */

describe('SC-008 mint → call → deny (T042 — US1 MVP integration)', () => {
  let harness: SpHarness;

  beforeEach(async () => {
    harness = await createSpHarness({
      seedSpec: {
        clientId: 'analytics-pipeline',
        name: 'Analytics Pipeline',
        scopes: ['platform:read'],
      },
    });
  });

  afterEach(async () => {
    await harness.app.close();
  });

  describe('mint surface — fixture-issued bearer matches Hydra contract shape', () => {
    it('JWT carries sub=client_id, aud=client_id, no alkemio_actor_id', async () => {
      const token = await harness.seed.signToken();
      const [, payloadB64] = token.split('.');
      const payload = JSON.parse(
        Buffer.from(payloadB64, 'base64url').toString('utf8')
      ) as Record<string, unknown>;

      expect(payload.sub).toBe('analytics-pipeline');
      expect(payload.aud).toBe('analytics-pipeline');
      expect(payload.client_id).toBe('analytics-pipeline');
      expect(payload.scope).toBe('platform:read');
      expect(payload.alkemio_actor_id).toBeUndefined();
    });
  });

  describe('in-scope call (platform:read)', () => {
    it('returns 200 and emits one FR-019 request{success} row', async () => {
      const token = await harness.seed.signToken();
      const requestId = 'req-in-scope-1';

      const res = await request(harness.app.getHttpServer())
        .post('/api/private/graphql')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Request-Id', requestId)
        .send({
          operationName: 'PlatformInfo',
          requiredScope: 'platform:read',
        });

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.stub.clientId).toBe('analytics-pipeline');

      const requestRows = findAuditEvents(harness.audit, 'request');
      const successRows = requestRows.filter(
        e => e.outcome === 'success' && e.request_id === requestId
      );
      expect(successRows).toHaveLength(1);
      expect(successRows[0]).toMatchObject({
        actor_type: 'service-client',
        service_client_id: 'analytics-pipeline',
        operation_identifier: 'PlatformInfo',
        granted_scope: 'platform:read',
      });
    });
  });

  describe('out-of-scope call (platform:write)', () => {
    it('returns 403 with FORBIDDEN_SCOPE distinguishable from UNAUTHENTICATED', async () => {
      const token = await harness.seed.signToken({
        // Bearer asks for write — strategy intersects with cache configured
        // (`platform:read` only) → grantedScopes drops `platform:write`.
        // Resolver-stub then 403s on missing required scope.
        scope: 'platform:write',
      });
      const res = await request(harness.app.getHttpServer())
        .post('/api/private/graphql')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Request-Id', 'req-out-of-scope-1')
        .send({
          operationName: 'CreateSpace',
          requiredScope: 'platform:write',
        });

      expect(res.status).toBe(403);
      expect(res.body.errors[0].extensions.code).toBe('FORBIDDEN_SCOPE');
      expect(res.body.errors[0].extensions.code).not.toBe('UNAUTHENTICATED');
      expect(res.body.errors[0].extensions.missing_scope).toBe(
        'platform:write'
      );
    });

    it('emits FR-022 scope_denial row carrying actor_type:"service-client" + missing_scope', async () => {
      const token = await harness.seed.signToken({ scope: 'platform:write' });
      const requestId = 'req-scope-denied';
      await request(harness.app.getHttpServer())
        .post('/api/private/graphql')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Request-Id', requestId)
        .send({
          operationName: 'CreateSpace',
          requiredScope: 'platform:write',
        });

      const denialRows = findAuditEvents(harness.audit, 'scope_denial').filter(
        e => e.request_id === requestId
      );
      expect(denialRows).toHaveLength(1);
      expect(denialRows[0]).toMatchObject({
        actor_type: 'service-client',
        service_client_id: 'analytics-pipeline',
        operation_identifier: 'CreateSpace',
        payload: { missing_scope: 'platform:write' },
      });
    });

    it('suppresses the request row for the same request_id (single-emission rule, T044)', async () => {
      const token = await harness.seed.signToken({ scope: 'platform:write' });
      const requestId = 'req-suppress';
      await request(harness.app.getHttpServer())
        .post('/api/private/graphql')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Request-Id', requestId)
        .send({ requiredScope: 'platform:write' });

      const requestRows = findAuditEvents(harness.audit, 'request').filter(
        e => e.request_id === requestId
      );
      // Strategy-side rejects emit `request{denial_reason}`; the
      // scope-denial path (resolver layer) emits `scope_denial` ONLY.
      // Neither path emits a `request` row for this request_id.
      expect(requestRows).toHaveLength(0);
    });
  });

  describe('audit attribution — every record names the client as actor', () => {
    it('no record carries an alkemio_actor_id claim', async () => {
      const token = await harness.seed.signToken();
      await request(harness.app.getHttpServer())
        .post('/api/private/graphql')
        .set('Authorization', `Bearer ${token}`)
        .send({ requiredScope: 'platform:read' });

      const allLines = harness.audit
        .flatMap(c => c.split('\n'))
        .filter(l => l.trim().length > 0)
        .map(l => {
          try {
            return JSON.parse(l) as Record<string, unknown>;
          } catch {
            return null;
          }
        })
        .filter((x): x is Record<string, unknown> => x !== null);

      // SP admissions never resolve an alkemio_actor_id. Every SP-tagged
      // record MUST omit the field.
      for (const rec of allLines) {
        if (rec.actor_type === 'service-client') {
          expect(rec.alkemio_actor_id ?? null).toBeNull();
        }
      }
    });
  });
});
