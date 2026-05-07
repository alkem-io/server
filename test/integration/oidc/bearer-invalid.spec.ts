import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  type BearerHarness,
  createBearerHarness,
  findAuditEvent,
} from './bearer-test-harness';

// T050 — tampered signature, expired token, clock-skew tolerance window.
describe('Bearer invalid token paths (T050)', () => {
  let harness: BearerHarness;

  beforeEach(async () => {
    harness = await createBearerHarness();
  });

  afterEach(async () => {
    await harness.app.close();
  });

  it('rejects a token with tampered signature', async () => {
    const token = await harness.signToken();
    // Flip the last char of the signature segment — recoverable parse but
    // signature mismatch.
    // Flip a middle byte of the signature so the change actually mutates a
    // decoded byte (last-byte flips can be absorbed by base64url padding).
    const parts = token.split('.');
    const sig = parts[2];
    const mid = Math.floor(sig.length / 2);
    const swap = sig[mid] === 'A' ? 'B' : 'A';
    parts[2] = sig.slice(0, mid) + swap + sig.slice(mid + 1);
    const tampered = parts.join('.');
    const res = await request(harness.app.getHttpServer())
      .post('/api/private/graphql')
      .set('Authorization', `Bearer ${tampered}`)
      .send({ query: '{ me { id } }' });
    expect(res.status).toBe(401);
    expect(
      findAuditEvent(harness.audit, 'auth.bearer.validation_failed')
    ).toBeDefined();
  });

  it('rejects a token expired by 45s (outside 30s tolerance)', async () => {
    const now = Math.floor(Date.now() / 1000);
    const token = await harness.signToken({ exp: now - 45, iat: now - 600 });
    const res = await request(harness.app.getHttpServer())
      .post('/api/private/graphql')
      .set('Authorization', `Bearer ${token}`)
      .send({ query: '{ me { id } }' });
    expect(res.status).toBe(401);
  });

  it('accepts a token expired by 15s (inside 30s tolerance)', async () => {
    const now = Math.floor(Date.now() / 1000);
    const token = await harness.signToken({ exp: now - 15, iat: now - 600 });
    const res = await request(harness.app.getHttpServer())
      .post('/api/private/graphql')
      .set('Authorization', `Bearer ${token}`)
      .send({ query: '{ me { id } }' });
    expect(res.status).toBe(200);
  });

  it('rejects a token with nbf 45s in the future', async () => {
    const now = Math.floor(Date.now() / 1000);
    const token = await harness.signToken({}, { notBefore: now + 45 });
    const res = await request(harness.app.getHttpServer())
      .post('/api/private/graphql')
      .set('Authorization', `Bearer ${token}`)
      .send({ query: '{ me { id } }' });
    expect(res.status).toBe(401);
  });

  it('accepts a token with nbf 15s in the future (inside tolerance)', async () => {
    const now = Math.floor(Date.now() / 1000);
    const token = await harness.signToken({}, { notBefore: now + 15 });
    const res = await request(harness.app.getHttpServer())
      .post('/api/private/graphql')
      .set('Authorization', `Bearer ${token}`)
      .send({ query: '{ me { id } }' });
    expect(res.status).toBe(200);
  });

  it('rejects a malformed bearer header', async () => {
    const res = await request(harness.app.getHttpServer())
      .post('/api/private/graphql')
      .set('Authorization', 'Bearer not.a.jwt.with.too.many.dots')
      .send({ query: '{ me { id } }' });
    expect(res.status).toBe(401);
  });
});
