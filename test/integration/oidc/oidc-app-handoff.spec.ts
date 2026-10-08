import { APP_VERIFIER_HEADER } from '@core/auth/oidc/constants';
import { createHash } from 'crypto';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  buildFakeTokenSet,
  createOidcHarness,
  extractCookie,
  FIXED_STATE,
  type OidcHarness,
  PRE_AUTH_COOKIE_NAME,
} from './oidc-test-harness';

const APP_VERIFIER = 'app-verifier-0123456789abcdefghijklmnopqrstuvwxyz';
const APP_CHALLENGE = createHash('sha256')
  .update(APP_VERIFIER)
  .digest('base64url');
const RETURN_TO = '/spaces/alkemio';

describe('GET /api/auth/oidc/app-handoff (FR-008…FR-012)', () => {
  let harness: OidcHarness;

  beforeEach(async () => {
    harness = await createOidcHarness({ appMode: true });
    harness.oidcService.client.callback.mockResolvedValue(buildFakeTokenSet());
  });

  afterEach(async () => {
    await harness.app.close();
  });

  /** Drive a real app-mode `/callback` and return the code it handed out. */
  async function mintCode(): Promise<string> {
    const cookie = await harness.preAuthCookie({
      returnTo: RETURN_TO,
      app_challenge: APP_CHALLENGE,
    });
    const res = await request(harness.app.getHttpServer())
      .get(
        `/api/auth/oidc/callback?${new URLSearchParams({
          state: FIXED_STATE,
          code: 'code-123',
        }).toString()}`
      )
      .set('Cookie', `${PRE_AUTH_COOKIE_NAME}=${encodeURIComponent(cookie)}`);
    expect(res.status).toBe(302);
    return res.header.location.split('code=')[1];
  }

  function redeem(code: string, verifier?: string): request.Test {
    const req = request(harness.app.getHttpServer()).get(
      `/api/auth/oidc/app-handoff?code=${encodeURIComponent(code)}`
    );
    return verifier === undefined
      ? req
      : req.set(APP_VERIFIER_HEADER, verifier);
  }

  it('happy path: code + verifier header establishes the session and 302s to returnTo', async () => {
    const res = await redeem(await mintCode(), APP_VERIFIER);

    expect(res.status).toBe(302);
    expect(res.header.location).toBe(RETURN_TO);
    const sessionCookie = extractCookie(
      res.header['set-cookie'],
      harness.sessionCookieName
    );
    expect(sessionCookie).not.toBeNull();
    expect(sessionCookie!.toLowerCase()).toContain('httponly');
  });

  it('rejects a replayed code with no session', async () => {
    const code = await mintCode();
    await redeem(code, APP_VERIFIER);
    const res = await redeem(code, APP_VERIFIER);

    expect(res.status).toBe(302);
    expect(res.header.location).toBe('/login?app_signin=failed');
    expect(
      extractCookie(res.header['set-cookie'], harness.sessionCookieName)
    ).toBeNull();
  });

  it('rejects a wrong verifier and burns the code anyway (FR-009)', async () => {
    const code = await mintCode();
    const wrong = await redeem(code, 'not-the-verifier');
    expect(wrong.header.location).toBe('/login?app_signin=failed');
    expect(
      extractCookie(wrong.header['set-cookie'], harness.sessionCookieName)
    ).toBeNull();

    // The correct verifier no longer helps: the record went on the first try.
    const retry = await redeem(code, APP_VERIFIER);
    expect(retry.header.location).toBe('/login?app_signin=failed');
  });

  it('rejects a request with no verifier header', async () => {
    const res = await redeem(await mintCode());
    expect(res.status).toBe(302);
    expect(res.header.location).toBe('/login?app_signin=failed');
    expect(
      extractCookie(res.header['set-cookie'], harness.sessionCookieName)
    ).toBeNull();
  });
});
