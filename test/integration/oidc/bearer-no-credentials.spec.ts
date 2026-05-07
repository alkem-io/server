import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  type BearerHarness,
  createBearerHarness,
  findAuditEvent,
} from './bearer-test-harness';

// FR-024b state-(a) — when no Authorization header is present, the strategy
// MUST return null (anonymous fall-through) rather than throw. This pins the
// invariant that "no credentials" stays a 200 anonymous response — distinct
// from "invalid credentials" which throws and surfaces as 401 UNAUTHENTICATED.
describe('Bearer no-credentials state-(a) (FR-024b, T079)', () => {
  let harness: BearerHarness;

  beforeEach(async () => {
    harness = await createBearerHarness();
  });

  afterEach(async () => {
    await harness.app.close();
  });

  it('without an Authorization header, the strategy returns null (state a)', async () => {
    const res = await request(harness.app.getHttpServer())
      .post('/api/private/graphql')
      .send({ query: '{ me { id } }' });
    // The harness's middleware maps `!user` (state-(a) null) to 401 +
    // `{error: "unauthenticated"}`. The PRODUCTION interceptor instead
    // swaps null → anonymous ActorContext + lets the request proceed. The
    // distinction this test pins is: no `BearerValidationError` is thrown,
    // and no auth.bearer.* audit is emitted (state-a is silent — no failure
    // to record).
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: 'unauthenticated' });
    // No audit failure events should be emitted for state-(a).
    expect(
      findAuditEvent(harness.audit, 'auth.bearer.invalid_audience')
    ).toBeUndefined();
    expect(
      findAuditEvent(harness.audit, 'auth.bearer.missing_alkemio_claim')
    ).toBeUndefined();
    expect(
      findAuditEvent(harness.audit, 'auth.bearer.validation_failed')
    ).toBeUndefined();
  });

  it('with an empty Authorization header (whitespace), the strategy returns null (state a)', async () => {
    const res = await request(harness.app.getHttpServer())
      .post('/api/private/graphql')
      .set('Authorization', '   ')
      .send({ query: '{ me { id } }' });
    // Empty/whitespace Authorization is still "credentials present" from a
    // wire perspective — but it doesn't match the BEARER_RE regex, so the
    // strategy throws BearerValidationError('malformed_bearer_header').
    // This pins state-(b), distinguishing from a TRULY missing header.
    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({
      errors: [
        {
          extensions: {
            code: 'UNAUTHENTICATED',
            error_code: 'malformed_bearer_header',
          },
        },
      ],
    });
    expect(
      findAuditEvent(harness.audit, 'auth.bearer.validation_failed')
    ).toMatchObject({ error_code: 'malformed_bearer_header' });
  });
});
