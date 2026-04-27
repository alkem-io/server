import {
  PRE_AUTH_COOKIE_MAX_AGE_S,
  PRE_AUTH_COOKIE_NAME,
  PRE_AUTH_COOKIE_PATH,
  preAuthCookieAttributes,
  signPreAuthCookie,
  verifyPreAuthCookie,
} from '@core/auth/oidc/pre-auth-cookie';
import { describe, expect, it } from 'vitest';

const key = new Uint8Array(32).fill(7);

const payload = {
  state: 'state-abcdef0123456789',
  nonce: 'nonce-fedcba9876543210',
  code_verifier: 'verifier-qwertyuiopasdfghjklzxcvbnm0123456789',
  returnTo: '/spaces/alkemio',
  issued_at: Math.floor(Date.now() / 1000),
};

describe('pre-auth-cookie (FR-017b)', () => {
  it('round-trips sign → verify with identical payload', async () => {
    const jws = await signPreAuthCookie(payload, key);
    const verified = await verifyPreAuthCookie(jws, key);
    expect(verified).toEqual(payload);
  });

  it('verification fails when the JWS is tampered', async () => {
    const jws = await signPreAuthCookie(payload, key);
    // flip a byte in the signature segment (last dot-part)
    const parts = jws.split('.');
    parts[2] = parts[2].split('').reverse().join('');
    const tampered = parts.join('.');
    await expect(verifyPreAuthCookie(tampered, key)).rejects.toThrow();
  });

  it('verification fails with a different signing key', async () => {
    const jws = await signPreAuthCookie(payload, key);
    const otherKey = new Uint8Array(32).fill(11);
    await expect(verifyPreAuthCookie(jws, otherKey)).rejects.toThrow();
  });

  it('verification fails when the payload is missing a required field', async () => {
    const jws = await signPreAuthCookie(payload, key);
    const [header, , signature] = jws.split('.');
    const mangledBody = Buffer.from(
      JSON.stringify({ state: payload.state, nonce: payload.nonce })
    ).toString('base64url');
    const mangled = `${header}.${mangledBody}.${signature}`;
    await expect(verifyPreAuthCookie(mangled, key)).rejects.toThrow();
  });

  it('sets exactly the cookie attributes required by FR-017b', () => {
    const insecure = preAuthCookieAttributes(false);
    expect(insecure).toEqual({
      httpOnly: true,
      sameSite: 'lax',
      path: PRE_AUTH_COOKIE_PATH,
      maxAge: PRE_AUTH_COOKIE_MAX_AGE_S * 1000,
      secure: false,
    });

    const secure = preAuthCookieAttributes(true);
    expect(secure.secure).toBe(true);
  });

  it('PRE_AUTH_COOKIE_* constants match the spec', () => {
    expect(PRE_AUTH_COOKIE_NAME).toBe('alkemio_oidc_pre_auth');
    expect(PRE_AUTH_COOKIE_PATH).toBe('/api/auth/oidc');
    expect(PRE_AUTH_COOKIE_MAX_AGE_S).toBe(600);
  });
});
