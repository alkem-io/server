import type { Response } from 'express';
import {
  clearSessionCookie,
  sessionCookieClearOptions,
} from './session-cookie';

// server#6315. A clearing Set-Cookie only matches an existing cookie when name,
// domain and path agree — otherwise the browser keeps the original and quietly
// stores a second one. These tests pin the attributes against `main.server.ts`,
// because a drift between the two is invisible at runtime: nothing errors, the
// session simply refuses to go away.
describe('sessionCookieClearOptions', () => {
  it('expires the cookie and mirrors the attributes used to set it', () => {
    const opts = sessionCookieClearOptions({
      name: 'alkemio_session',
      secure: true,
      domain: 'alkem.io',
    });

    expect(opts).toMatchObject({
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      secure: true,
      domain: 'alkem.io',
      maxAge: 0,
    });
    expect(opts.expires?.getTime()).toBeLessThan(Date.now());
  });

  it('omits domain entirely when none is configured', () => {
    // Local dev leaves `OIDC_SESSION_COOKIE_DOMAIN` empty. Emitting
    // `Domain=undefined` (or the literal string) would target a different
    // cookie than the host-only one express-session set.
    const opts = sessionCookieClearOptions({
      name: 'alkemio_session',
      secure: false,
    });
    expect('domain' in opts).toBe(false);
    expect(opts.secure).toBe(false);
  });

  it('passes a leading-dot domain through verbatim', () => {
    // The deployed shape, observed on dev: the session cookie is a DOMAIN
    // cookie whose domain reads `.dev-alkem.io` in the browser. Whatever
    // `OIDC_SESSION_COOKIE_DOMAIN` holds — with or without the leading dot —
    // must reach the clear exactly as it reached the set, since both read the
    // same config key. Normalising it here (stripping or adding a dot) would
    // reintroduce the very mismatch this helper exists to prevent.
    const opts = sessionCookieClearOptions({
      name: 'alkemio_session',
      secure: true,
      domain: '.dev-alkem.io',
    });
    expect(opts.domain).toBe('.dev-alkem.io');
  });

  it('carries the per-environment cookie name through untouched', () => {
    // Envs suffix the name (alkemio_session_sandbox). Hardcoding the default
    // makes every clear a no-op outside local dev.
    const res = { cookie: vi.fn(), headersSent: false } as unknown as Response;
    clearSessionCookie(res, { name: 'alkemio_session_sandbox', secure: true });
    expect(res.cookie).toHaveBeenCalledWith(
      'alkemio_session_sandbox',
      '',
      expect.objectContaining({ maxAge: 0 })
    );
  });
});

describe('clearSessionCookie', () => {
  it('is a no-op when there is no usable response', () => {
    // GraphQL subscriptions and some test harnesses have no `res`.
    expect(clearSessionCookie(undefined, { name: 'c', secure: false })).toBe(
      false
    );
    expect(clearSessionCookie(null, { name: 'c', secure: false })).toBe(false);
    expect(
      clearSessionCookie({} as unknown as Response, {
        name: 'c',
        secure: false,
      })
    ).toBe(false);
  });

  it('does not attempt to write a header after the response has been sent', () => {
    const res = { cookie: vi.fn(), headersSent: true } as unknown as Response;
    expect(clearSessionCookie(res, { name: 'c', secure: false })).toBe(false);
    expect(res.cookie).not.toHaveBeenCalled();
  });

  it('swallows a throwing response rather than escalating a 401 into a 500', () => {
    const res = {
      headersSent: false,
      cookie: vi.fn(() => {
        throw new Error('stream already closed');
      }),
    } as unknown as Response;
    expect(clearSessionCookie(res, { name: 'c', secure: false })).toBe(false);
  });
});
