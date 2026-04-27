import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  createOidcHarness,
  extractCookie,
  type OidcHarness,
} from './oidc-test-harness';

// FR-022b — with a well-formed alkemio_session cookie on POST /api/private/graphql,
// when the session-store backend times out / refuses connection, alkemio-server
// MUST respond with 503 + Retry-After: 5 and MUST NOT clear the cookie nor
// redirect to /api/auth/oidc/login.
describe('GraphQL cookie path under Redis-unreachable (FR-022b)', () => {
  let harness: OidcHarness;

  beforeEach(async () => {
    harness = await createOidcHarness();
  });

  afterEach(async () => {
    await harness.app.close();
  });

  it('returns 503 + Retry-After: 5 without clearing alkemio_session when Redis is unreachable', async () => {
    // Test hook — the session-store factory used by the harness exposes a
    // simulateFailure() toggle. Until the impl wires this on a real resolver,
    // this spec is RED.
    const simulate = (
      harness as unknown as { simulateRedisFailure?: () => void }
    ).simulateRedisFailure;
    simulate?.();

    const res = await request(harness.app.getHttpServer())
      .post('/api/private/graphql')
      .set('Cookie', `${harness.sessionCookieName}=an-opaque-sid`)
      .send({ query: '{ me { id } }' });

    expect(res.status).toBe(503);
    expect(res.header['retry-after']).toBe('5');

    const clearing = extractCookie(
      res.header['set-cookie'],
      harness.sessionCookieName
    );
    expect(clearing?.toLowerCase()).not.toMatch(/max-age=0\b/);

    // And MUST NOT 302 to /api/auth/oidc/login.
    expect(res.header.location).toBeUndefined();
  });

  it('on Redis recovery, the same cookie resolves normally on the next request without re-auth', async () => {
    const simulate = harness as unknown as {
      simulateRedisFailure?: () => void;
      simulateRedisRecovery?: () => void;
    };
    simulate.simulateRedisFailure?.();

    await request(harness.app.getHttpServer())
      .post('/api/private/graphql')
      .set('Cookie', `${harness.sessionCookieName}=an-opaque-sid`)
      .send({ query: '{ me { id } }' })
      .expect(503);

    simulate.simulateRedisRecovery?.();

    const res = await request(harness.app.getHttpServer())
      .post('/api/private/graphql')
      .set('Cookie', `${harness.sessionCookieName}=an-opaque-sid`)
      .send({ query: '{ me { id } }' });

    // After recovery the resolver runs; implementation may return any
    // non-5xx HTTP response. The key invariant: no Set-Cookie clearing.
    const clearing = extractCookie(
      res.header['set-cookie'],
      harness.sessionCookieName
    );
    expect(clearing?.toLowerCase()).not.toMatch(/max-age=0\b/);
  });
});
