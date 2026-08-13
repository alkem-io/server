import type { CookieOptions, Response } from 'express';

/**
 * One definition of the `alkemio_session` cookie's attributes, shared by the
 * code that sets it and the code that clears it (server#6315).
 *
 * **Why this file exists.** A `Set-Cookie` that clears only matches an existing
 * cookie when `name`, `domain` and `path` agree; browsers key cookies on that
 * triple. A clear written with different attributes does not fail — it silently
 * creates *another* cookie and leaves the original in place, so the session
 * appears to survive a sign-out.
 *
 * That is not hypothetical here. `main.server.ts` sets the session cookie with
 * `domain: oidcConfig.cookie.domain || undefined`, while every hand-written
 * clear in `oidc.controller.ts` omitted `domain` entirely. Locally the config
 * leaves the domain empty so both sides agree and the bug is invisible; in any
 * environment that sets `OIDC_SESSION_COOKIE_DOMAIN` the clear silently misses.
 * Routing every clear through here removes the chance to disagree.
 *
 * Attributes mirror `main.server.ts` exactly. Change them in one place, not two.
 */
export type SessionCookieConfig = {
  name: string;
  secure: boolean;
  /** Empty/absent in local dev; a real domain in deployed environments. */
  domain?: string;
};

/**
 * The attributes shared by the set and the clear. `maxAge` is deliberately
 * absent — it is the only field the two differ on.
 */
function baseAttributes(cfg: SessionCookieConfig): CookieOptions {
  return {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: cfg.secure,
    ...(cfg.domain ? { domain: cfg.domain } : {}),
  };
}

/**
 * Options for a `Set-Cookie` that expires the session cookie immediately.
 *
 * `maxAge: 0` alone is enough for every browser in support; `expires` in the
 * past is added for the same reason express's own `clearCookie` does it —
 * belt-and-braces against clients that honour only one of the two.
 */
export function sessionCookieClearOptions(
  cfg: SessionCookieConfig
): CookieOptions {
  return {
    ...baseAttributes(cfg),
    maxAge: 0,
    expires: new Date(0),
  };
}

/**
 * Clear the session cookie on a response, tolerating a response object that is
 * missing or already sent.
 *
 * Best-effort by contract: this runs on the rejection path of an authentication
 * check (`AuthInterceptor`), and a failure to clear a cookie must never convert
 * a clean 401 into a 500. Returns whether the header was written, which is what
 * the tests assert on.
 */
export function clearSessionCookie(
  res: Response | undefined | null,
  cfg: SessionCookieConfig
): boolean {
  if (!res || typeof res.cookie !== 'function' || res.headersSent) return false;
  try {
    res.cookie(cfg.name, '', sessionCookieClearOptions(cfg));
    return true;
  } catch {
    return false;
  }
}
