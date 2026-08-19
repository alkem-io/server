import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createOidcHarness, type OidcHarness } from './oidc-test-harness';

/**
 * server#6332 defect D1, at the HTTP level — FR-001, FR-028, SC-001.
 *
 * The strategy-level obligation (S10 in `contracts/session-id-resolution.md`)
 * proves that `CookieSessionStrategy` issues no session-store call for a
 * cookie-less request. That is necessary and NOT sufficient: `express-session`
 * calls `store.get(req.sessionID)` ITSELF, from its own middleware, before any
 * authentication code runs. A regression that reintroduced D1 there — or that
 * flipped `saveUninitialized` to `true`, making every anonymous request WRITE a
 * session — would leave S10 perfectly green while every cookie-less request hit
 * Redis again.
 *
 * So this asserts the property FR-028 actually claims: across the whole request
 * lifecycle, a request bearing no session cookie performs ZERO operations on
 * the session store. It counts `get`/`set`/`touch`/`destroy` on the store the
 * middleware drives, which is the only vantage point that can see all of them.
 *
 * On `develop` @ caa1a0d33 this fails on the first assertion: `get` is 1,
 * because express-session generated a sid and the strategy looked it up.
 */
describe('cookie-less requests perform zero session-store operations (FR-028 / SC-001)', () => {
  let harness: OidcHarness;

  beforeEach(async () => {
    harness = await createOidcHarness();
    // Setup done during harness construction must not be counted.
    harness.resetExpressSessionStoreCalls();
    harness.sessionStore.resetCalls();
  });

  afterEach(async () => {
    await harness.app.close();
  });

  it('sends no cookie at all → no get, set, touch or destroy', async () => {
    const res = await request(harness.app.getHttpServer())
      .post('/api/private/graphql')
      .send({ query: '{ me { id } }' });

    // 401 because the route is guarded and the request is anonymous — an
    // answer from the AUTH layer, reached without consulting the store.
    expect(res.status).toBe(401);
    expect(harness.expressSessionStoreCalls).toEqual({
      get: 0,
      set: 0,
      touch: 0,
      destroy: 0,
    });
    // Where D1 actually lived: the strategy's own lookup. This is the counter
    // that is non-zero on `caa1a0d33`.
    expect(harness.sessionStore.calls).toEqual({
      get: 0,
      destroy: 0,
      markTerminated: 0,
    });
  });

  it('sends an unrelated cookie → still zero store operations', async () => {
    const res = await request(harness.app.getHttpServer())
      .post('/api/private/graphql')
      .set('Cookie', 'some_other_cookie=value')
      .send({ query: '{ me { id } }' });

    expect(res.status).toBe(401);
    expect(harness.expressSessionStoreCalls).toEqual({
      get: 0,
      set: 0,
      touch: 0,
      destroy: 0,
    });
    // Where D1 actually lived: the strategy's own lookup. This is the counter
    // that is non-zero on `caa1a0d33`.
    expect(harness.sessionStore.calls).toEqual({
      get: 0,
      destroy: 0,
      markTerminated: 0,
    });
  });

  it('repeated cookie-less requests never accumulate store operations', async () => {
    // The single-request assertions above would still pass if the store were
    // touched once per N requests. FR-001's claim is that anonymous traffic is
    // *never* the store's business, so drive it more than once.
    for (let i = 0; i < 5; i++) {
      await request(harness.app.getHttpServer())
        .post('/api/private/graphql')
        .send({ query: '{ me { id } }' });
    }

    expect(harness.expressSessionStoreCalls).toEqual({
      get: 0,
      set: 0,
      touch: 0,
      destroy: 0,
    });
    // Where D1 actually lived: the strategy's own lookup. This is the counter
    // that is non-zero on `caa1a0d33`.
    expect(harness.sessionStore.calls).toEqual({
      get: 0,
      destroy: 0,
      markTerminated: 0,
    });
  });

  it('a store outage is invisible to a cookie-less request (SC-001)', async () => {
    // The whole point of D1: with the store unreachable, a request that needs
    // no session must be unaffected — it never asks, so there is nothing to
    // fail. This is the automated form of the live walk's §3.
    harness.simulateRedisFailure();

    const res = await request(harness.app.getHttpServer())
      .post('/api/private/graphql')
      .send({ query: '{ me { id } }' });

    // The load-bearing assertion: 401, NOT 503. A 503 would mean the store was
    // consulted and reported unavailable — i.e. D1 had returned. Answering 401
    // proves the request was resolved without ever asking.
    expect(res.status).toBe(401);
    expect(res.status).not.toBe(503);
    expect(harness.expressSessionStoreCalls).toEqual({
      get: 0,
      set: 0,
      touch: 0,
      destroy: 0,
    });
    // Where D1 actually lived: the strategy's own lookup. This is the counter
    // that is non-zero on `caa1a0d33`.
    expect(harness.sessionStore.calls).toEqual({
      get: 0,
      destroy: 0,
      markTerminated: 0,
    });
  });
});
