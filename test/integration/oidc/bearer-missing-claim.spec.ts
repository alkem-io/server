import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  type BearerHarness,
  createBearerHarness,
  findAuditEvent,
} from './bearer-test-harness';

// FR-024a — token with valid signature/iss/aud/exp but no alkemio_actor_id
// MUST be rejected with 401 + auth.bearer.missing_alkemio_claim. No resolver
// runs. T049.
describe('Bearer missing alkemio_actor_id (FR-024a, T049)', () => {
  let harness: BearerHarness;

  beforeEach(async () => {
    harness = await createBearerHarness();
  });

  afterEach(async () => {
    await harness.app.close();
  });

  it('rejects a structurally-valid Bearer that lacks alkemio_actor_id', async () => {
    const token = await harness.signToken({ alkemio_actor_id: undefined });
    const res = await request(harness.app.getHttpServer())
      .post('/api/private/graphql')
      .set('Authorization', `Bearer ${token}`)
      .send({ query: '{ me { id } }' });
    expect(res.status).toBe(401);
    const audit = findAuditEvent(
      harness.audit,
      'auth.bearer.missing_alkemio_claim'
    );
    expect(audit).toBeDefined();
    // FR-035 minimal field set — correlation_id present, no PII leakage.
    expect(typeof audit?.correlation_id).toBe('string');
    expect(audit?.error_code).toBe('missing_alkemio_actor_id');
  });
});
