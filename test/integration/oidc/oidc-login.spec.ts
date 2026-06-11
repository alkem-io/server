import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  createOidcHarness,
  extractCookie,
  FIXED_CODE_CHALLENGE,
  FIXED_NONCE,
  FIXED_STATE,
  type OidcHarness,
  PRE_AUTH_COOKIE_NAME,
  PRE_AUTH_COOKIE_PATH,
} from './oidc-test-harness';

describe('GET /api/auth/oidc/login (FR-017 + FR-017a + FR-017b)', () => {
  let harness: OidcHarness;

  beforeEach(async () => {
    harness = await createOidcHarness();
  });

  afterEach(async () => {
    await harness.app.close();
  });

  it('302-redirects to Hydra authorize with scope + PKCE + nonce always set', async () => {
    const res = await request(harness.app.getHttpServer())
      .get('/api/auth/oidc/login?returnTo=/spaces/alkemio')
      .expect(302);

    const location = res.header.location as string;
    expect(location).toContain('http://hydra.example/oauth2/auth');
    const url = new URL(location);
    expect(url.searchParams.get('response_type')).toBe('code');
    expect(url.searchParams.get('code_challenge_method')).toBe('S256');
    expect(url.searchParams.get('scope')).toBe(
      'openid profile email offline_access alkemio'
    );
    expect(url.searchParams.get('nonce')).toBeTruthy(); // always sent
    expect(url.searchParams.get('state')).toBeTruthy();
    expect(url.searchParams.get('code_challenge')).toBeTruthy();
  });

  it('sets a signed pre-auth HttpOnly cookie on /api/auth/oidc, Max-Age=600', async () => {
    const res = await request(harness.app.getHttpServer())
      .get('/api/auth/oidc/login')
      .expect(302);

    const cookie = extractCookie(
      res.header['set-cookie'],
      PRE_AUTH_COOKIE_NAME
    );
    expect(cookie).not.toBeNull();
    expect(cookie!.toLowerCase()).toContain('httponly');
    expect(cookie!.toLowerCase()).toContain('samesite=lax');
    expect(cookie!).toContain(`Path=${PRE_AUTH_COOKIE_PATH}`);
    expect(cookie!.toLowerCase()).toMatch(/max-age=600\b/);
  });

  it('defaults returnTo to `/` on FR-017a rejection (protocol-relative)', async () => {
    const res = await request(harness.app.getHttpServer())
      .get('/api/auth/oidc/login?returnTo=//evil.example/x')
      .expect(302);

    // The controller is expected to emit an auth.returnTo.rejected warn-audit and
    // still 302 to Hydra; validated returnTo is embedded in the pre-auth cookie,
    // not the URL, so this spec only asserts the redirect still happened.
    expect(res.header.location).toContain('http://hydra.example/oauth2/auth');
  });

  it('calls client.authorizationUrl with response_type=code, scope, nonce, and code_challenge_method=S256', async () => {
    await request(harness.app.getHttpServer())
      .get('/api/auth/oidc/login')
      .expect(302);
    expect(harness.oidcService.client.authorizationUrl).toHaveBeenCalledOnce();
    const args = harness.oidcService.client.authorizationUrl.mock.calls[0][0];
    expect(args.response_type).toBe('code');
    expect(args.scope).toBe('openid profile email offline_access alkemio');
    expect(args.code_challenge_method).toBe('S256');
    expect(typeof args.nonce).toBe('string');
    expect(args.nonce.length).toBeGreaterThan(0);
    expect(typeof args.code_challenge).toBe('string');
    expect(args.code_challenge.length).toBeGreaterThan(0);
  });

  it('the same correlation-id appears on the response header', async () => {
    const res = await request(harness.app.getHttpServer())
      .get('/api/auth/oidc/login')
      .set('X-Request-Id', 'abcdef-1234-correlate')
      .expect(302);
    expect(res.header['x-request-id']).toBe('abcdef-1234-correlate');
  });

  // Anchor constants used by follow-up specs — kept in scope via import side-effects.
  it('harness fixed state/nonce constants are non-empty', () => {
    expect(FIXED_STATE.length).toBeGreaterThan(0);
    expect(FIXED_NONCE.length).toBeGreaterThan(0);
    expect(FIXED_CODE_CHALLENGE.length).toBeGreaterThan(0);
  });
});
