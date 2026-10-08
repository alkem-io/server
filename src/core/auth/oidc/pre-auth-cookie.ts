import { jwtVerify, SignJWT } from 'jose';

export const PRE_AUTH_COOKIE_NAME = 'alkemio_oidc_pre_auth';
export const PRE_AUTH_COOKIE_PATH = '/api/auth/oidc';
export const PRE_AUTH_COOKIE_MAX_AGE_S = 600;

export type PreAuthCookiePayload = {
  state: string;
  nonce: string;
  code_verifier: string;
  returnTo: string;
  issued_at: number;
  /**
   * workspace#082 — set only when the QUERY leg of `/login` entered app mode,
   * and read only by `/callback`, which is a separate request. It is a property
   * of ONE flow: no leg revives it from the cookie into a NEW flow. 079's stated
   * reason for the carry-forward does not hold at Kratos v26.2.0 —
   * specs/082-app-handoff-scheme-squat/spec.md §2 (owner).
   */
  app_challenge?: string;
};

export type PreAuthCookieAttributes = {
  httpOnly: true;
  sameSite: 'lax';
  path: typeof PRE_AUTH_COOKIE_PATH;
  maxAge: number;
  secure: boolean;
};

// FR-017b — sign the pre-auth bundle with HS256 JWS. The signing key is the
// shared secret from `identity.authentication.providers.oidc.pre_auth_cookie_signing_key`.
// Caller converts base64url (or similar) to bytes before handing to these helpers.

export async function signPreAuthCookie(
  payload: PreAuthCookiePayload,
  key: Uint8Array
): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuedAt(payload.issued_at)
    .setExpirationTime(payload.issued_at + PRE_AUTH_COOKIE_MAX_AGE_S)
    .sign(key);
}

export async function verifyPreAuthCookie(
  jws: string,
  key: Uint8Array
): Promise<PreAuthCookiePayload> {
  const { payload } = await jwtVerify(jws, key, { algorithms: ['HS256'] });
  const {
    state,
    nonce,
    code_verifier: codeVerifier,
    returnTo,
    issued_at: issuedAt,
    app_challenge: appChallenge,
  } = payload as Record<string, unknown>;

  if (
    typeof state !== 'string' ||
    typeof nonce !== 'string' ||
    typeof codeVerifier !== 'string' ||
    typeof returnTo !== 'string' ||
    typeof issuedAt !== 'number' ||
    // Absent is the ordinary web flow; present-but-not-a-string is a forgery
    // attempt or a corrupt payload, and either way must not reach the
    // app-mode branch in `/callback`.
    (appChallenge !== undefined && typeof appChallenge !== 'string')
  ) {
    throw new Error('pre-auth cookie payload shape invalid');
  }

  return {
    state,
    nonce,
    code_verifier: codeVerifier,
    returnTo,
    issued_at: issuedAt,
    app_challenge: appChallenge,
  };
}

export function preAuthCookieAttributes(
  secure: boolean
): PreAuthCookieAttributes {
  return {
    httpOnly: true,
    sameSite: 'lax',
    path: PRE_AUTH_COOKIE_PATH,
    maxAge: PRE_AUTH_COOKIE_MAX_AGE_S * 1000,
    secure,
  };
}
