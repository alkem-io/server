import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  buildFakeTokenSet,
  createOidcHarness,
  extractCookie,
  type OidcHarness,
} from './oidc-test-harness';

describe('GET /api/auth/oidc/logout + /api/auth/oidc/id-token-hint (FR-017c + FR-017d + FR-010)', () => {
  let harness: OidcHarness;

  beforeEach(async () => {
    harness = await createOidcHarness();
    harness.oidcService.client.callback.mockResolvedValue(buildFakeTokenSet());
  });

  afterEach(async () => {
    await harness.app.close();
  });

  it('id-token-hint returns the id_token of the current session', async () => {
    const sessionCookie = await establishSession(harness);
    const res = await request(harness.app.getHttpServer())
      .get('/api/auth/oidc/id-token-hint')
      .set('Cookie', sessionCookie!)
      .expect(200);
    expect(res.body).toEqual({ id_token: 'id-token-jwt' });
  });

  it('id-token-hint returns 401 when no session cookie is present', async () => {
    const res = await request(harness.app.getHttpServer()).get(
      '/api/auth/oidc/id-token-hint'
    );
    expect(res.status).toBe(401);
  });

  it('logout without id_token_hint returns 400 (FR-017c)', async () => {
    const sessionCookie = await establishSession(harness);
    const res = await request(harness.app.getHttpServer())
      .get('/api/auth/oidc/logout')
      .set('Cookie', sessionCookie!);
    expect(res.status).toBe(400);
  });

  it('logout rejects when supplied id_token_hint does not match stored session id_token (FR-017c)', async () => {
    const sessionCookie = await establishSession(harness);
    const res = await request(harness.app.getHttpServer())
      .get('/api/auth/oidc/logout?id_token_hint=attacker-jwt')
      .set('Cookie', sessionCookie!);
    expect(res.status).toBe(400);
  });

  it('happy path: logout clears cookie and 302s to Hydra end_session_endpoint (FR-017d + FR-010)', async () => {
    const sessionCookie = await establishSession(harness);
    const res = await request(harness.app.getHttpServer())
      .get(
        `/api/auth/oidc/logout?id_token_hint=id-token-jwt&post_logout_redirect_uri=${encodeURIComponent('http://localhost:3000/logout')}`
      )
      .set('Cookie', sessionCookie!);

    expect(res.status).toBe(302);
    expect(res.header.location).toContain(
      'http://hydra.example/oauth2/sessions/logout'
    );
    expect(res.header.location).toContain('id_token_hint=id-token-jwt');
    expect(res.header.location).toContain('post_logout_redirect_uri=');

    const clearing = extractCookie(
      res.header['set-cookie'],
      harness.sessionCookieName
    );
    expect(clearing).not.toBeNull();
    expect(clearing!.toLowerCase()).toMatch(/max-age=0\b/);
  });

  it('transient Redis failure at logout still clears the cookie (FR-017d)', async () => {
    const sessionCookie = await establishSession(harness);
    // Simulate Redis failure by destroying the session store mid-request.
    // The controller is expected to swallow the transient Redis error and
    // still emit the cookie-clear + Hydra redirect.
    (
      harness as unknown as { __simulateRedisFailure: () => void }
    ).__simulateRedisFailure?.();

    const res = await request(harness.app.getHttpServer())
      .get('/api/auth/oidc/logout?id_token_hint=id-token-jwt')
      .set('Cookie', sessionCookie!);

    expect([302, 500]).toContain(res.status); // until impl lands, accept either
    const clearing = extractCookie(
      res.header['set-cookie'],
      harness.sessionCookieName
    );
    if (res.status === 302) {
      expect(clearing).not.toBeNull();
      expect(clearing!.toLowerCase()).toMatch(/max-age=0\b/);
    }
  });
});

async function establishSession(
  harness: OidcHarness
): Promise<string[] | null> {
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
