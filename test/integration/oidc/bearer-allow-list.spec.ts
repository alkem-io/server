import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  type BearerHarness,
  createBearerHarness,
  findAuditEvent,
} from './bearer-test-harness';

// FR-024 — Bearer audience allow-list. Token whose `aud` matches one of the
// configured audiences is accepted; outside the list → 401 +
// auth.bearer.invalid_audience audit. T048.
describe('Bearer audience allow-list (FR-024, T048)', () => {
  let harness: BearerHarness;

  beforeEach(async () => {
    harness = await createBearerHarness();
  });

  afterEach(async () => {
    await harness.app.close();
  });

  it('accepts a Bearer with aud in the allow-list', async () => {
    const token = await harness.signToken({ aud: 'alkemio-web' });
    const res = await request(harness.app.getHttpServer())
      .post('/api/private/graphql')
      .set('Authorization', `Bearer ${token}`)
      .send({ query: '{ me { id } }' });
    expect(res.status).toBe(200);
  });

  it('rejects a Bearer with aud outside the allow-list', async () => {
    const token = await harness.signToken({ aud: 'rogue-client' });
    const res = await request(harness.app.getHttpServer())
      .post('/api/private/graphql')
      .set('Authorization', `Bearer ${token}`)
      .send({ query: '{ me { id } }' });
    expect(res.status).toBe(401);
    expect(
      findAuditEvent(harness.audit, 'auth.bearer.invalid_audience')
    ).toBeDefined();
  });
});
