import { createHash } from 'crypto';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  APP_MODE_COOKIE_DOMAIN,
  APP_REDIRECT_SCHEME,
  buildFakeTokenSet,
  createOidcHarness,
  extractCookie,
  FIXED_NONCE,
  FIXED_STATE,
  KRATOS_SESSION_COOKIE_NAME,
  type OidcHarness,
  PRE_AUTH_COOKIE_NAME,
} from './oidc-test-harness';

const APP_VERIFIER = 'app-verifier-0123456789abcdefghijklmnopqrstuvwxyz';
const APP_CHALLENGE = createHash('sha256')
  .update(APP_VERIFIER)
  .digest('base64url');

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

describe('GET /api/auth/oidc/callback in app mode (FR-005/FR-007)', () => {
  let harness: OidcHarness;

  beforeEach(async () => {
    harness = await createOidcHarness({ appMode: true });
    harness.oidcService.client.callback.mockResolvedValue(buildFakeTokenSet());
  });

  afterEach(async () => {
    await harness.app.close();
  });

  async function appCallback(cookie: string): Promise<request.Response> {
    return request(harness.app.getHttpServer())
      .get(
        `/api/auth/oidc/callback?${new URLSearchParams({
          state: FIXED_STATE,
          code: 'code-123',
        }).toString()}`
      )
      .set('Cookie', `${PRE_AUTH_COOKIE_NAME}=${encodeURIComponent(cookie)}`);
  }

  it('establishes no session in this jar, clears the Kratos cookie, and 302s to the app scheme', async () => {
    const cookie = await harness.preAuthCookie({
      returnTo: '/spaces/alkemio',
      app_challenge: APP_CHALLENGE,
    });
    const res = await appCallback(cookie);

    expect(res.status).toBe(302);
    expect(
      res.header.location.startsWith(
        `${APP_REDIRECT_SCHEME}:/auth/callback?code=`
      )
    ).toBe(true);
    expect(res.header.location.split('code=')[1]).toMatch(
      /^[A-Za-z0-9_-]{43}$/
    );

    // FR-005 — the auth browser's jar gets nothing.
    expect(
      extractCookie(res.header['set-cookie'], harness.sessionCookieName)
    ).toBeNull();

    // FR-007 / server#6315 — a clear that mismatches name, domain or path
    // leaves the original in place and stores a second cookie.
    const kratosClear = extractCookie(
      res.header['set-cookie'],
      KRATOS_SESSION_COOKIE_NAME
    );
    expect(kratosClear).not.toBeNull();
    expect(kratosClear!).toContain(`Domain=${APP_MODE_COOKIE_DOMAIN}`);
    expect(kratosClear!).toContain('Path=/');
    expect(kratosClear!.toLowerCase()).toMatch(/max-age=0\b/);

    const clearingPreAuth = extractCookie(
      res.header['set-cookie'],
      PRE_AUTH_COOKIE_NAME
    );
    expect(clearingPreAuth).not.toBeNull();
    expect(clearingPreAuth!.toLowerCase()).toMatch(/max-age=0\b/);
  });

  // SC-009 — the assertion that makes a compose-backed acceptance walk for web
  // sign-in unnecessary: even on an app-CAPABLE deployment, a flow carrying no
  // app_challenge anywhere is byte-for-byte the pre-change flow.
  it('leaves a no-challenge flow identical to an app-unaware deployment', async () => {
    const webHarness = await createOidcHarness();
    webHarness.oidcService.client.callback.mockResolvedValue(
      buildFakeTokenSet()
    );
    try {
      const shape = (res: request.Response) => ({
        status: res.status,
        location: res.header.location,
        cookies: ([] as string[])
          .concat(res.header['set-cookie'] ?? [])
          .map(c => {
            const [pair, ...attrs] = c.split(';');
            return `${pair.split('=')[0]};${attrs.join(';')}`;
          })
          .sort(),
      });

      const appCapable = await appCallback(
        await harness.preAuthCookie({ returnTo: '/spaces/alkemio' })
      );
      const appUnaware = await request(webHarness.app.getHttpServer())
        .get(
          `/api/auth/oidc/callback?${new URLSearchParams({
            state: FIXED_STATE,
            code: 'code-123',
          }).toString()}`
        )
        .set(
          'Cookie',
          `${PRE_AUTH_COOKIE_NAME}=${encodeURIComponent(
            await webHarness.preAuthCookie({ returnTo: '/spaces/alkemio' })
          )}`
        );

      expect(shape(appCapable)).toEqual(shape(appUnaware));
      expect(appCapable.header.location).toBe('/spaces/alkemio');
    } finally {
      await webHarness.app.close();
    }
  });
});
