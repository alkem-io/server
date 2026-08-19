import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  createOidcHarness,
  extractCookie,
  type OidcHarness,
  signSessionCookie,
} from './oidc-test-harness';

// server#6332 — the cookie must be the SIGNED wire form. These specs used to
// send a bare `an-opaque-sid`, which express-session rejects (it then generates
// a fresh sid); the strategy now correctly treats that as "no session
// presented" and resolves anonymous WITHOUT reading the store, so it no longer
// reaches the store-unavailable path at all. Presenting a properly signed
// cookie is what keeps these specs testing FR-022b rather than testing D1.
const SESSION_COOKIE_VALUE = signSessionCookie('an-opaque-sid');

// FR-022b — with a well-formed alkemio_session cookie on POST /api/private/graphql,
// when the session-store backend times out / refuses connection, alkemio-server
// MUST respond with 503 + Retry-After: 5 and MUST NOT clear the cookie nor
// redirect to /api/auth/oidc/login.
describe('GraphQL cookie path under Redis-unreachable (FR-022b)', () => {
  let harness: OidcHarness;

  beforeEach(async () => {
    harness = await createOidcHarness();
    // Make express-session recognise the sid, so it preserves it as
    // `req.sessionID` rather than generating a replacement — the precondition
    // for the strategy reaching the session store at all (server#6332 D1).
    await harness.seedSession('an-opaque-sid');
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
      .set(
        'Cookie',
        `${harness.sessionCookieName}=${encodeURIComponent(SESSION_COOKIE_VALUE)}`
      )
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
      .set(
        'Cookie',
        `${harness.sessionCookieName}=${encodeURIComponent(SESSION_COOKIE_VALUE)}`
      )
      .send({ query: '{ me { id } }' })
      .expect(503);

    simulate.simulateRedisRecovery?.();

    const res = await request(harness.app.getHttpServer())
      .post('/api/private/graphql')
      .set(
        'Cookie',
        `${harness.sessionCookieName}=${encodeURIComponent(SESSION_COOKIE_VALUE)}`
      )
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
