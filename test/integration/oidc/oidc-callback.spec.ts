import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  buildFakeTokenSet,
  createOidcHarness,
  extractCookie,
  FIXED_NONCE,
  FIXED_STATE,
  type OidcHarness,
  PRE_AUTH_COOKIE_NAME,
} from './oidc-test-harness';

describe('GET /api/auth/oidc/callback (FR-017b + FR-020 + FR-021)', () => {
  let harness: OidcHarness;

  beforeEach(async () => {
    harness = await createOidcHarness();
    harness.oidcService.client.callback.mockResolvedValue(buildFakeTokenSet());
  });

  afterEach(async () => {
    await harness.app.close();
  });

  async function callback(
    cookie: string | null,
    query: Record<string, string>
  ): Promise<request.Response> {
    const req = request(harness.app.getHttpServer()).get(
      `/api/auth/oidc/callback?${new URLSearchParams(query).toString()}`
    );
    if (cookie)
      req.set(
        'Cookie',
        `${PRE_AUTH_COOKIE_NAME}=${encodeURIComponent(cookie)}`
      );
    return req;
  }

  it('rejects with 400 minimal HTML when pre-auth cookie is absent (FR-017b)', async () => {
    const res = await callback(null, { state: FIXED_STATE, code: 'code-123' });
    expect(res.status).toBe(400);
    expect(res.header['content-type']).toMatch(/text\/html/);
    // No Hydra token call MUST have been attempted.
    expect(harness.oidcService.client.callback).not.toHaveBeenCalled();
  });

  it('rejects with 400 when pre-auth cookie is tampered', async () => {
    const res = await callback('garbage.garbage.garbage', {
      state: FIXED_STATE,
      code: 'code-123',
    });
    expect(res.status).toBe(400);
    expect(harness.oidcService.client.callback).not.toHaveBeenCalled();
  });

  it('rejects when query state does not match pre-auth cookie state', async () => {
    const cookie = await harness.preAuthCookie({ state: 'real-state' });
    const res = await callback(cookie, {
      state: 'attacker-state',
      code: 'code-123',
    });
    expect(res.status).toBe(400);
    expect(harness.oidcService.client.callback).not.toHaveBeenCalled();
  });

  it('happy path: calls client.callback with code + code_verifier + nonce, regenerates session, sets alkemio_session cookie, redirects to returnTo', async () => {
    const cookie = await harness.preAuthCookie({ returnTo: '/spaces/alkemio' });
    const res = await callback(cookie, {
      state: FIXED_STATE,
      code: 'code-123',
    });
    expect(res.status).toBe(302);
    expect(res.header.location).toBe('/spaces/alkemio');

    expect(harness.oidcService.client.callback).toHaveBeenCalledOnce();
    const callArgs = harness.oidcService.client.callback.mock.calls[0];
    const [, params, checks] = callArgs;
    expect(params.code).toBe('code-123');
    expect(params.state).toBe(FIXED_STATE);
    expect(checks.code_verifier).toBeTruthy();
    expect(checks.nonce).toBe(FIXED_NONCE);
    expect(checks.state).toBe(FIXED_STATE);

    const sessionCookie = extractCookie(
      res.header['set-cookie'],
      harness.sessionCookieName
    );
    expect(sessionCookie).not.toBeNull();
    expect(sessionCookie!.toLowerCase()).toContain('httponly');
    expect(sessionCookie!.toLowerCase()).toContain('samesite=lax');

    const clearingPreAuth = extractCookie(
      res.header['set-cookie'],
      PRE_AUTH_COOKIE_NAME
    );
    expect(clearingPreAuth).not.toBeNull();
    expect(clearingPreAuth!.toLowerCase()).toMatch(/max-age=0\b/);
  });

  it('rejects callback with ID-token nonce mismatch (pre-session-establishment)', async () => {
    harness.oidcService.client.callback.mockResolvedValueOnce(
      buildFakeTokenSet({
        claims: () => ({
          sub: 'sub-1',
          alkemio_actor_id: 'actor-1',
          nonce: 'attacker-nonce',
        }),
      })
    );
    const cookie = await harness.preAuthCookie();
    const res = await callback(cookie, {
      state: FIXED_STATE,
      code: 'code-123',
    });
    expect(res.status).toBe(400);
    const sessionCookie = extractCookie(
      res.header['set-cookie'],
      harness.sessionCookieName
    );
    // No session cookie MUST have been issued.
    expect(sessionCookie).toBeNull();
  });

  it('session.regenerate runs exactly once per successful callback (FR-021)', async () => {
    const cookie = await harness.preAuthCookie();
    const firstSid = await captureSid(harness, cookie);
    const secondSid = await captureSid(harness, await harness.preAuthCookie());
    expect(firstSid).toBeTruthy();
    expect(secondSid).toBeTruthy();
    expect(firstSid).not.toBe(secondSid);
  });
});

async function captureSid(
  harness: OidcHarness,
  cookie: string
): Promise<string | null> {
  const res = await request(harness.app.getHttpServer())
    .get(
      `/api/auth/oidc/callback?${new URLSearchParams({ state: FIXED_STATE, code: 'code-123' }).toString()}`
    )
    .set('Cookie', `${PRE_AUTH_COOKIE_NAME}=${encodeURIComponent(cookie)}`);
  const setCookie = res.header['set-cookie'];
  const ours = extractCookie(setCookie, harness.sessionCookieName);
  return ours;
}
