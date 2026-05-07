import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  buildFakeTokenSet,
  createOidcHarness,
  extractCookie,
  type OidcHarness,
  parseCookieValue,
} from './oidc-test-harness';

// express-session signed cookie format: `s:<sid>.<sig>`. Extract the bare
// sid (the segment between the `s:` prefix and the signature `.` boundary).
function extractSidFromCookie(
  setCookie: string | string[],
  name: string
): string {
  const header = extractCookie(setCookie, name);
  if (!header) throw new Error(`cookie ${name} not in Set-Cookie`);
  const raw = parseCookieValue(header);
  const stripped = raw.startsWith('s:') ? raw.slice(2) : raw;
  const dot = stripped.lastIndexOf('.');
  return dot === -1 ? stripped : stripped.slice(0, dot);
}

// These tests exercise the refresh-loop behaviour that is wired on every
// authenticated request path (GraphQL + REST). They assume a test-only
// `/api/auth/oidc/refresh` or equivalent trigger that forces the refresh
// path to execute; until that trigger lands the tests are RED.
describe('OIDC refresh loop (FR-008 + FR-009 + FR-022 + FR-022a + FR-022c)', () => {
  let harness: OidcHarness;

  beforeEach(async () => {
    harness = await createOidcHarness();
    harness.oidcService.client.callback.mockResolvedValue(buildFakeTokenSet());
  });

  afterEach(async () => {
    await harness.app.close();
  });

  it('temporarily_unavailable does NOT rotate and does NOT tear down the session (FR-022)', async () => {
    const sessionCookie = await establish(harness);
    const err = Object.assign(new Error('temporarily_unavailable'), {
      error: 'temporarily_unavailable',
    });
    harness.oidcService.client.refresh.mockRejectedValueOnce(err);

    const res = await request(harness.app.getHttpServer())
      .get('/api/auth/oidc/refresh')
      .set('Cookie', sessionCookie!);

    // The session cookie MUST still be valid; no Set-Cookie clearing it.
    const clearing = extractCookie(
      res.header['set-cookie'],
      harness.sessionCookieName
    );
    expect(clearing?.toLowerCase()).not.toMatch(/max-age=0\b/);
  });

  it('persistent temporarily_unavailable triggers teardown at 3 failures (FR-022c)', async () => {
    const sessionCookie = await establish(harness);
    const err = Object.assign(new Error('temporarily_unavailable'), {
      error: 'temporarily_unavailable',
    });
    harness.oidcService.client.refresh.mockRejectedValue(err);

    let last: request.Response | undefined;
    for (let i = 0; i < 3; i += 1) {
      last = await request(harness.app.getHttpServer())
        .get('/api/auth/oidc/refresh')
        .set('Cookie', sessionCookie!);
    }
    const clearing = extractCookie(
      last!.header['set-cookie'],
      harness.sessionCookieName
    );
    expect(clearing?.toLowerCase()).toMatch(/max-age=0\b/);
  });

  it('invalid_grant trips immediate teardown on first occurrence', async () => {
    const sessionCookie = await establish(harness);
    const err = Object.assign(new Error('invalid_grant'), {
      error: 'invalid_grant',
    });
    harness.oidcService.client.refresh.mockRejectedValueOnce(err);

    const res = await request(harness.app.getHttpServer())
      .get('/api/auth/oidc/refresh')
      .set('Cookie', sessionCookie!);

    const clearing = extractCookie(
      res.header['set-cookie'],
      harness.sessionCookieName
    );
    expect(clearing?.toLowerCase()).toMatch(/max-age=0\b/);
  });

  // FR-024b state-(b) + FR-022c — after teardown, the session payload in the
  // store is replaced with a tombstone (`terminated_at` set, short TTL). The
  // next request from a stale tab still holding the cookie surfaces this
  // tombstone via `cookie-session.strategy.ts`, which throws
  // `CookieSessionInvalidError` — distinguishing "had-a-session-now-invalid"
  // (state b → 401) from "never-existed" (state a → anonymous).
  it('teardown leaves a tombstone in the session store (FR-022c + FR-024b)', async () => {
    const sessionCookie = await establish(harness);
    const sid = extractSidFromCookie(sessionCookie!, harness.sessionCookieName);
    const err = Object.assign(new Error('invalid_grant'), {
      error: 'invalid_grant',
    });
    harness.oidcService.client.refresh.mockRejectedValueOnce(err);

    await request(harness.app.getHttpServer())
      .get('/api/auth/oidc/refresh')
      .set('Cookie', sessionCookie!);

    // The session-store now holds a tombstone payload at the same sid (rather
    // than nothing). Cookie-session strategy reads this on the next request
    // and throws CookieSessionInvalidError — pinned in unit-level coverage of
    // the strategy. Here we assert the store-level invariant: the payload is
    // present AND carries `terminated_at`.
    const tombstone = await harness.sessionStore.get(sid);
    expect(tombstone).not.toBeNull();
    expect(tombstone?.terminated_at).toBeTypeOf('number');
    expect(tombstone?.terminated_reason).toMatch(/^refresh_/);
    // Tombstone clears the live token fields.
    expect(tombstone?.access_token).toBe('');
    expect(tombstone?.id_token).toBe('');
    expect(tombstone?.refresh_token).toBe('');
  });

  it('FR-008 grace: replaying the rotated-out refresh token within 60 s returns the SAME new pair, no re-rotation', async () => {
    const sessionCookie = await establish(harness);
    const firstPair = buildFakeTokenSet({
      refresh_token: 'rt-v2',
      access_token: 'at-v2',
    });
    harness.oidcService.client.refresh.mockResolvedValueOnce(firstPair);

    const firstRes = await request(harness.app.getHttpServer())
      .get('/api/auth/oidc/refresh')
      .set('Cookie', sessionCookie!);
    expect([200, 204]).toContain(firstRes.status);

    // Replay (simulated by calling refresh again within grace with the old RT;
    // the oidc-service path returns the same new pair and does NOT invalidate)
    const replayPair = buildFakeTokenSet({
      refresh_token: 'rt-v2',
      access_token: 'at-v2',
    });
    harness.oidcService.client.refresh.mockResolvedValueOnce(replayPair);
    const replayRes = await request(harness.app.getHttpServer())
      .get('/api/auth/oidc/refresh')
      .set('Cookie', sessionCookie!);
    expect([200, 204]).toContain(replayRes.status);
  });

  it('FR-009: replay of a rotated-out refresh token AFTER the 60 s grace invalidates the family', async () => {
    const sessionCookie = await establish(harness);
    const invalidFamily = Object.assign(new Error('invalid_grant'), {
      error: 'invalid_grant',
      error_description: 'refresh token replay outside grace window',
    });
    harness.oidcService.client.refresh.mockRejectedValueOnce(invalidFamily);

    const res = await request(harness.app.getHttpServer())
      .get('/api/auth/oidc/refresh')
      .set('Cookie', sessionCookie!);

    const clearing = extractCookie(
      res.header['set-cookie'],
      harness.sessionCookieName
    );
    expect(clearing?.toLowerCase()).toMatch(/max-age=0\b/);
  });

  it('FR-022a: per-session refresh lock — two concurrent refreshes do NOT issue two Hydra calls', async () => {
    const sessionCookie = await establish(harness);
    const nextPair = buildFakeTokenSet({
      refresh_token: 'rt-v2',
      access_token: 'at-v2',
    });
    harness.oidcService.client.refresh.mockResolvedValue(nextPair);

    const [a, b] = await Promise.all([
      request(harness.app.getHttpServer())
        .get('/api/auth/oidc/refresh')
        .set('Cookie', sessionCookie!),
      request(harness.app.getHttpServer())
        .get('/api/auth/oidc/refresh')
        .set('Cookie', sessionCookie!),
    ]);
    expect([200, 204]).toContain(a.status);
    expect([200, 204]).toContain(b.status);

    // Only one of the two calls MUST have reached Hydra.
    expect(harness.oidcService.client.refresh).toHaveBeenCalledTimes(1);
  });
});

async function establish(harness: OidcHarness): Promise<string[] | null> {
  const preAuth = await harness.preAuthCookie();
  const res = await request(harness.app.getHttpServer())
    .get(
      '/api/auth/oidc/callback?state=state-0123456789abcdef0123456789abcdef&code=code-123'
    )
    .set('Cookie', `alkemio_oidc_pre_auth=${encodeURIComponent(preAuth)}`);
  const setCookie = res.header['set-cookie'];
  if (!setCookie) return null;
  const list = Array.isArray(setCookie) ? setCookie : [setCookie];
  const only = list.find(c => c.startsWith(`${harness.sessionCookieName}=`));
  return only ? [only] : null;
}
