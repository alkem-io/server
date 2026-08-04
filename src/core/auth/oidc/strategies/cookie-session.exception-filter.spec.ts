import type { ArgumentsHost } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { AlkemioConfig } from '@src/types';
import type { NextFunction, Request, Response } from 'express';
import { SessionStoreUnavailableError } from './cookie-session.errors';
import {
  applyStoreUnavailableResponse,
  CookieSessionStoreUnavailableFilter,
  cookieSessionStoreUnavailableMiddleware,
  type SessionCookieAttributes,
  sessionCookieAttributesFrom,
} from './cookie-session.exception-filter';

// server#6332, spec 109 contract `store-unavailable-response.md`.
//
// Covers test obligations U4 (the cookie is re-asserted in FULL and never
// cleared), U5 (the shipped REST filter behaviour is intact), U7 (the express
// error middleware answers 503 for a typed store failure and passes anything
// else on) and U8 (every path a client can land on produces the same status,
// the same retry hint and the same cookie treatment).
//
// The theme running through all four: a transient Redis outage must look like
// "come back in five seconds", never like "your session is gone". The moment a
// store-unavailable response emits a clearing Set-Cookie — or re-asserts with a
// weaker attribute set than the cookie was issued with — a Redis blip becomes a
// forced logout or a security downgrade, which is the exact bug this file
// exists to prevent.

/** The production-shaped attribute set: Secure, domain-scoped, 14 days. */
const PROD_COOKIE: SessionCookieAttributes = {
  name: 'alkemio_session',
  secure: true,
  domain: '.alkem.io',
  maxAge: 1_209_600_000, // 14d in ms
  sameSite: 'lax',
  path: '/',
  httpOnly: true,
};

// A realistically shaped signed cookie: `s:` prefix, a `.` separator and a
// percent-encoded byte. If anything on the path re-signed or re-encoded the
// value, this is the shape that would show it.
const PRESENTED = 's:kx9RaW.5jQ%2Bt7dZm0nEwLp8ug';

type FakeResponse = ReturnType<typeof buildRes>;

/**
 * Minimal express `Response` double — the same "object of `vi.fn()`s, cast at
 * the call site" approach `session-cookie.spec.ts` uses.
 *
 * `clearCookie` is present precisely so we can assert it is NEVER reached:
 * a double that lacks the method could only ever fail by throwing, which is a
 * much weaker signal than an explicit `not.toHaveBeenCalled()`.
 */
const buildRes = (headersSent = false) => {
  const res = {
    cookie: vi.fn(),
    setHeader: vi.fn(),
    json: vi.fn(),
    clearCookie: vi.fn(),
    status: vi.fn(),
    headersSent,
  };
  // `res.status(503).json(body)` is a chain — the double has to return itself.
  res.status.mockImplementation(() => res);
  return res;
};

const asRes = (res: FakeResponse) => res as unknown as Response;

/** The options object the response site handed to `res.cookie`. */
const cookieOptsOf = (res: FakeResponse): Record<string, unknown> =>
  res.cookie.mock.calls[0]?.[2] as Record<string, unknown>;

const buildHost = (req: unknown, res: FakeResponse): ArgumentsHost =>
  ({
    switchToHttp: () => ({
      getRequest: () => req,
      getResponse: () => res,
    }),
  }) as unknown as ArgumentsHost;

/**
 * A `ConfigService` returning the OIDC block in the shape
 * `sessionCookieAttributesFrom` reads: `{ cookie: { name, secure, domain,
 * idle_ttl_s } }`.
 */
const buildConfigService = (cookie: {
  name: string;
  secure: boolean;
  domain?: string;
  idle_ttl_s: number;
}) =>
  ({
    get: vi.fn().mockReturnValue({ cookie }),
  }) as unknown as ConfigService<AlkemioConfig, true>;

const buildFilter = (
  cookie: {
    name: string;
    secure: boolean;
    domain?: string;
    idle_ttl_s: number;
  } = {
    name: 'alkemio_session',
    secure: true,
    domain: '.alkem.io',
    idle_ttl_s: 1_209_600,
  }
) => new CookieSessionStoreUnavailableFilter(buildConfigService(cookie));

// ---------------------------------------------------------------------------
// U4 — the shared wire-shape helper (FR-020, contract G2 + G3)
// ---------------------------------------------------------------------------

describe('applyStoreUnavailableResponse (U4)', () => {
  it('re-asserts the presented cookie with the FULL configured attribute set', () => {
    // G3. The shipped `send503` set only httpOnly/sameSite/path. Against a
    // production deployment that response tells the browser to replace a
    // Secure, domain-scoped, 14-day cookie with a non-Secure, host-only,
    // browser-session one — a security downgrade, a shadowed cookie and a
    // silently shortened session, all triggered by a Redis blip. Asserting the
    // exact options object (not a subset) is what stops an attribute being
    // quietly dropped again.
    const res = buildRes();
    applyStoreUnavailableResponse(
      { cookies: { alkemio_session: PRESENTED } },
      asRes(res),
      PROD_COOKIE
    );

    expect(res.cookie).toHaveBeenCalledTimes(1);
    expect(res.cookie).toHaveBeenCalledWith('alkemio_session', PRESENTED, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      secure: true,
      domain: '.alkem.io',
      maxAge: 1_209_600_000,
    });
  });

  it('writes the RAW presented value verbatim, without re-signing it', () => {
    // G2. The value is echoed exactly as presented so no re-signing happens and
    // the signing secret is not needed at the response site. Any normalising,
    // re-encoding or re-signing here would invalidate a session the outage was
    // supposed to leave untouched.
    const res = buildRes();
    applyStoreUnavailableResponse(
      { cookies: { alkemio_session: PRESENTED } },
      asRes(res),
      PROD_COOKIE
    );

    expect(res.cookie.mock.calls[0][1]).toBe(PRESENTED);
  });

  it('never emits a clearing cookie: maxAge is positive and clearCookie is untouched', () => {
    // FR-020. "Session ended" clears; "store briefly unreachable" re-asserts.
    // Keeping that line intact is the whole point of the feature.
    const res = buildRes();
    applyStoreUnavailableResponse(
      { cookies: { alkemio_session: PRESENTED } },
      asRes(res),
      PROD_COOKIE
    );

    const opts = cookieOptsOf(res);
    expect(opts.maxAge).toBe(1_209_600_000);
    expect(opts.maxAge).not.toBe(0);
    expect(opts.expires).toBeUndefined();
    expect(res.clearCookie).not.toHaveBeenCalled();
  });

  it('OMITS maxAge entirely when the configured maxAge is 0', () => {
    // The trap this guard exists for: express turns `maxAge: 0` into an
    // `Expires` at the epoch, i.e. it CLEARS the cookie — the exact opposite of
    // re-asserting it. Passing 0 through would turn a store outage into the
    // forced logout FR-020 forbids, so the attribute must be absent, not zero.
    const res = buildRes();
    applyStoreUnavailableResponse(
      { cookies: { alkemio_session: PRESENTED } },
      asRes(res),
      { ...PROD_COOKIE, maxAge: 0 }
    );

    const opts = cookieOptsOf(res);
    expect('maxAge' in opts).toBe(false);
    expect(opts.maxAge).toBeUndefined();
  });

  it('OMITS maxAge entirely when no maxAge is configured', () => {
    // Same trap from the other direction: an absent maxAge must re-assert as a
    // browser-session cookie (the harness shape), not degrade into a clear.
    const res = buildRes();
    const { maxAge: _dropped, ...noMaxAge } = PROD_COOKIE;
    applyStoreUnavailableResponse(
      { cookies: { alkemio_session: PRESENTED } },
      asRes(res),
      noMaxAge
    );

    expect('maxAge' in cookieOptsOf(res)).toBe(false);
  });

  it('omits domain entirely when none is configured', () => {
    // Local dev leaves the domain empty. Emitting `Domain=undefined` would
    // target a different cookie than the host-only one express-session set.
    const res = buildRes();
    applyStoreUnavailableResponse(
      { cookies: { alkemio_session: PRESENTED } },
      asRes(res),
      { ...PROD_COOKIE, domain: undefined, secure: false }
    );

    const opts = cookieOptsOf(res);
    expect('domain' in opts).toBe(false);
    expect(opts.secure).toBe(false);
  });

  it('sets no cookie at all when none was presented', () => {
    // We do not invent a session cookie for a request that never carried one:
    // that would hand an anonymous caller a cookie it never had.
    const res = buildRes();
    applyStoreUnavailableResponse({ cookies: {} }, asRes(res), PROD_COOKIE);

    expect(res.cookie).not.toHaveBeenCalled();
    expect(res.clearCookie).not.toHaveBeenCalled();
    // The retry hint is still owed to the caller, cookie or no cookie.
    expect(res.setHeader).toHaveBeenCalledWith('Retry-After', '5');
  });

  it('sets no cookie when the request itself, or its cookie jar, is absent', () => {
    // graphql-ws upgrades and some harnesses reach here with no parsed cookies.
    const noReq = buildRes();
    applyStoreUnavailableResponse(undefined, asRes(noReq), PROD_COOKIE);
    expect(noReq.cookie).not.toHaveBeenCalled();
    expect(noReq.setHeader).toHaveBeenCalledWith('Retry-After', '5');

    const noJar = buildRes();
    applyStoreUnavailableResponse({}, asRes(noJar), PROD_COOKIE);
    expect(noJar.cookie).not.toHaveBeenCalled();
  });

  it('ignores a non-string or empty presented value rather than echoing it back', () => {
    // An empty value would re-assert an empty cookie, which browsers treat as
    // good as cleared; a non-string is malformed input we must not serialise.
    const empty = buildRes();
    applyStoreUnavailableResponse(
      { cookies: { alkemio_session: '' } },
      asRes(empty),
      PROD_COOKIE
    );
    expect(empty.cookie).not.toHaveBeenCalled();

    const wrongType = buildRes();
    applyStoreUnavailableResponse(
      { cookies: { alkemio_session: { nested: true } } },
      asRes(wrongType),
      PROD_COOKIE
    );
    expect(wrongType.cookie).not.toHaveBeenCalled();
  });

  it('always sets Retry-After: 5', () => {
    // FR-017. The single number a client acts on to decide "retry" instead of
    // "sign in again". It is a header value, so it must be the STRING '5'.
    const res = buildRes();
    applyStoreUnavailableResponse(
      { cookies: { alkemio_session: PRESENTED } },
      asRes(res),
      PROD_COOKIE
    );

    expect(res.setHeader).toHaveBeenCalledTimes(1);
    expect(res.setHeader).toHaveBeenCalledWith('Retry-After', '5');
  });

  it('writes nothing to a response whose headers are already sent', () => {
    // `express-session` does not only read the store on the way IN: a failed
    // `store.set` / `store.destroy` on the `res.end` path is reported with
    // `defer(next, err)` — a `setImmediate` that runs AFTER the headers have
    // been flushed. `res.setHeader`/`res.cookie` throw `ERR_HTTP_HEADERS_SENT`
    // there, with no request-scoped catch above it, so the throw is an
    // UNCAUGHT exception and takes the process down. A resilience fix that
    // turns a Redis outage into a crash loop is worse than the outage.
    const res = buildRes(true);

    expect(() =>
      applyStoreUnavailableResponse(
        { cookies: { alkemio_session: PRESENTED } },
        asRes(res),
        PROD_COOKIE
      )
    ).not.toThrow();

    expect(res.cookie).not.toHaveBeenCalled();
    expect(res.setHeader).not.toHaveBeenCalled();
    expect(res.clearCookie).not.toHaveBeenCalled();
  });

  it('falls back to the raw Cookie header when req.cookies is unpopulated', () => {
    // `resolveCookieSessionId` has this fallback precisely because
    // `cookie-parser` may not have run (WS upgrades, middleware reordering).
    // Reading only `req.cookies` HERE would silently drop the Set-Cookie on
    // exactly those requests — a store-unavailable response with no cookie
    // re-assertion is the "session ended" wire shape FR-020 forbids.
    const res = buildRes();
    applyStoreUnavailableResponse(
      {
        headers: {
          cookie: `other=1; alkemio_session=${encodeURIComponent(PRESENTED)}`,
        },
      },
      asRes(res),
      PROD_COOKIE
    );

    expect(res.cookie).toHaveBeenCalledWith(
      'alkemio_session',
      PRESENTED,
      expect.objectContaining({ secure: true, maxAge: 1_209_600_000 })
    );
  });

  it('tolerates a missing response without throwing', () => {
    // This application's Apollo context factory returns `{ req }` and never
    // `res`, so the GraphQL path legitimately has no express response to hand.
    // Throwing here would convert a 503 into a 500 on exactly the path the
    // feature is about.
    expect(() =>
      applyStoreUnavailableResponse(
        { cookies: { alkemio_session: PRESENTED } },
        undefined,
        PROD_COOKIE
      )
    ).not.toThrow();
  });
});

describe('sessionCookieAttributesFrom (U4)', () => {
  it('derives the full attribute set from the OIDC config block', () => {
    // One derivation, reused by `main.server.ts`, the filter and the
    // middleware — which is what makes "the cookie it re-asserts is the cookie
    // that was issued" true rather than hopeful. Note the seconds→ms widening.
    expect(
      sessionCookieAttributesFrom({
        cookie: {
          name: 'alkemio_session_sandbox',
          secure: true,
          domain: '.dev-alkem.io',
          idle_ttl_s: 1_209_600,
        },
      })
    ).toEqual({
      name: 'alkemio_session_sandbox',
      secure: true,
      domain: '.dev-alkem.io',
      maxAge: 1_209_600_000,
      sameSite: 'lax',
      path: '/',
      httpOnly: true,
    });
  });

  it('normalises an empty configured domain to undefined', () => {
    // Local dev leaves the domain env var empty; the empty string must not be
    // emitted as a Domain attribute.
    const attrs = sessionCookieAttributesFrom({
      cookie: {
        name: 'alkemio_session',
        secure: false,
        domain: '',
        idle_ttl_s: 60,
      },
    });
    expect(attrs.domain).toBeUndefined();
    expect(attrs.maxAge).toBe(60_000);
  });
});

// ---------------------------------------------------------------------------
// U5 — the Nest REST filter (FR-019). A guard: this behaviour shipped with
// 107-oidc-session-revocation and must survive the 6332 changes unchanged
// except for the (previously incomplete) cookie attributes.
// ---------------------------------------------------------------------------

describe('CookieSessionStoreUnavailableFilter (U5)', () => {
  it('answers 503 with the store-unavailable body', () => {
    const res = buildRes();
    buildFilter().catch(
      new SessionStoreUnavailableError(),
      buildHost({ cookies: { alkemio_session: PRESENTED } }, res)
    );

    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith({
      error: 'session_store_unavailable',
    });
  });

  it('sets Retry-After: 5', () => {
    const res = buildRes();
    buildFilter().catch(
      new SessionStoreUnavailableError(),
      buildHost({ cookies: { alkemio_session: PRESENTED } }, res)
    );

    expect(res.setHeader).toHaveBeenCalledWith('Retry-After', '5');
  });

  it('re-asserts the configured cookie and never clears it', () => {
    // The filter must delegate to the shared helper rather than re-deriving the
    // shape — so the attributes it emits are the ones the ConfigService block
    // describes, in full.
    const res = buildRes();
    buildFilter().catch(
      new SessionStoreUnavailableError(),
      buildHost({ cookies: { alkemio_session: PRESENTED } }, res)
    );

    expect(res.cookie).toHaveBeenCalledWith('alkemio_session', PRESENTED, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      secure: true,
      domain: '.alkem.io',
      maxAge: 1_209_600_000,
    });
    expect(res.clearCookie).not.toHaveBeenCalled();
    expect(cookieOptsOf(res).maxAge).not.toBe(0);
  });

  it('still answers 503 when the request carried no cookie', () => {
    // The cookie-less path is the one the original issue measured as a 401.
    const res = buildRes();
    buildFilter().catch(
      new SessionStoreUnavailableError(),
      buildHost({ cookies: {} }, res)
    );

    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.setHeader).toHaveBeenCalledWith('Retry-After', '5');
    expect(res.cookie).not.toHaveBeenCalled();
    expect(res.clearCookie).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// U7 — the raw express error middleware (FR-016a). On develop this path had no
// error handler at all, so a cookie-bearing request during a total outage got
// an HTML 500 — a third wrong answer nobody had measured.
// ---------------------------------------------------------------------------

describe('cookieSessionStoreUnavailableMiddleware (U7)', () => {
  it('answers 503 + Retry-After + re-asserted cookie for a typed store failure, and does not call next', () => {
    // Calling `next` after writing the response would hand the request on to
    // express's default error handler, which would try to write again.
    const res = buildRes();
    const next = vi.fn();

    cookieSessionStoreUnavailableMiddleware(PROD_COOKIE)(
      new SessionStoreUnavailableError(new Error('ECONNREFUSED')),
      { cookies: { alkemio_session: PRESENTED } } as unknown as Request,
      asRes(res),
      next as unknown as NextFunction
    );

    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith({
      error: 'session_store_unavailable',
    });
    expect(res.setHeader).toHaveBeenCalledWith('Retry-After', '5');
    expect(res.cookie).toHaveBeenCalledWith('alkemio_session', PRESENTED, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      secure: true,
      domain: '.alkem.io',
      maxAge: 1_209_600_000,
    });
    expect(res.clearCookie).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it('hands a typed failure to next() untouched once the headers are sent', () => {
    // The `res.end` path: `express-session` reports a failed `store.set` /
    // `store.destroy` with `defer(next, err)`, i.e. from a `setImmediate` after
    // the response has been flushed. Writing there throws
    // `ERR_HTTP_HEADERS_SENT` with nothing to catch it — an uncaught exception
    // that kills the process. Express's final handler knows how to deal with a
    // half-sent response; this middleware does not, so it must defer.
    const res = buildRes(true);
    const next = vi.fn();
    const err = new SessionStoreUnavailableError(new Error('ECONNREFUSED'));

    expect(() =>
      cookieSessionStoreUnavailableMiddleware(PROD_COOKIE)(
        err,
        { cookies: { alkemio_session: PRESENTED } } as unknown as Request,
        asRes(res),
        next as unknown as NextFunction
      )
    ).not.toThrow();

    expect(next).toHaveBeenCalledWith(err);
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
    expect(res.setHeader).not.toHaveBeenCalled();
    expect(res.cookie).not.toHaveBeenCalled();
  });

  it('passes any other error straight to next() and writes no response', () => {
    // This is the assertion that keeps the middleware honest. Answering 503 for
    // an unrelated error would misdescribe it — a genuine bug would be reported
    // to the client as "the session store is briefly unavailable, retry in 5s",
    // and the real error would never reach the error handler that logs it.
    const res = buildRes();
    const next = vi.fn();
    const unrelated = new TypeError('boom');

    cookieSessionStoreUnavailableMiddleware(PROD_COOKIE)(
      unrelated,
      { cookies: { alkemio_session: PRESENTED } } as unknown as Request,
      asRes(res),
      next as unknown as NextFunction
    );

    expect(next).toHaveBeenCalledTimes(1);
    // The SAME instance, not a wrapped or re-created one: stack and cause must
    // survive the hop.
    expect(next).toHaveBeenCalledWith(unrelated);
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
    expect(res.setHeader).not.toHaveBeenCalled();
    expect(res.cookie).not.toHaveBeenCalled();
    expect(res.clearCookie).not.toHaveBeenCalled();
  });

  it('passes on an error that merely looks like a store failure', () => {
    // The branch is `instanceof`, not a name comparison. A look-alike from
    // another layer must not be able to impersonate a store outage and suppress
    // its own reporting.
    const res = buildRes();
    const next = vi.fn();
    const lookalike = Object.assign(new Error('session_store_unavailable'), {
      name: 'SessionStoreUnavailableError',
    });

    cookieSessionStoreUnavailableMiddleware(PROD_COOKIE)(
      lookalike,
      { cookies: {} } as unknown as Request,
      asRes(res),
      next as unknown as NextFunction
    );

    expect(next).toHaveBeenCalledWith(lookalike);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('accepts a bare cookie name (harness form) and re-asserts with the implied defaults', () => {
    // `test/integration/oidc/oidc-test-harness.ts` pins a harness-local name and
    // has no config block to derive attributes from. The implied defaults are
    // non-Secure and host-only — right for the harness, which is exactly why
    // production passes the full object instead.
    const res = buildRes();
    const next = vi.fn();

    cookieSessionStoreUnavailableMiddleware('alkemio_session')(
      new SessionStoreUnavailableError(),
      { cookies: { alkemio_session: PRESENTED } } as unknown as Request,
      asRes(res),
      next as unknown as NextFunction
    );

    expect(res.cookie).toHaveBeenCalledWith('alkemio_session', PRESENTED, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      secure: false,
    });
    // No maxAge and no domain — and critically, maxAge is ABSENT rather than 0,
    // because 0 would clear the very cookie the harness is preserving.
    const opts = cookieOptsOf(res);
    expect('maxAge' in opts).toBe(false);
    expect('domain' in opts).toBe(false);
    expect(res.clearCookie).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(503);
  });

  it('accepts a full SessionCookieAttributes object (production form)', () => {
    const res = buildRes();
    const next = vi.fn();

    cookieSessionStoreUnavailableMiddleware(PROD_COOKIE)(
      new SessionStoreUnavailableError(),
      { cookies: { alkemio_session: PRESENTED } } as unknown as Request,
      asRes(res),
      next as unknown as NextFunction
    );

    expect(cookieOptsOf(res)).toEqual({
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      secure: true,
      domain: '.alkem.io',
      maxAge: 1_209_600_000,
    });
  });
});

// ---------------------------------------------------------------------------
// U8 — cross-path parity (FR-021)
// ---------------------------------------------------------------------------

describe('store-unavailable parity across paths (U8)', () => {
  // Three different layers can be the one that discovers the store is
  // unreachable, and a client must not be able to tell which. Comparing the
  // observed calls — rather than re-stating the expected shape twice — is what
  // makes "one shared definition" checkable instead of aspirational: if a
  // future edit changes one path's status, retry hint or cookie treatment, this
  // fails even if both paths remain internally self-consistent.
  //
  // Bodies are deliberately NOT compared across transports (contract G4): the
  // GraphQL arm emits an error envelope and lives in the interceptor, not here.
  const observe = (res: FakeResponse) => ({
    status: res.status.mock.calls,
    retryAfter: res.setHeader.mock.calls,
    cookie: res.cookie.mock.calls,
    cleared: res.clearCookie.mock.calls,
  });

  const runFilter = (cookies: Record<string, unknown>) => {
    const res = buildRes();
    buildFilter().catch(
      new SessionStoreUnavailableError(),
      buildHost({ cookies }, res)
    );
    return res;
  };

  const runMiddleware = (cookies: Record<string, unknown>) => {
    const res = buildRes();
    cookieSessionStoreUnavailableMiddleware(PROD_COOKIE)(
      new SessionStoreUnavailableError(),
      { cookies } as unknown as Request,
      asRes(res),
      vi.fn() as unknown as NextFunction
    );
    return res;
  };

  it('the REST filter and the express middleware agree, cookie present', () => {
    const filterRes = runFilter({ alkemio_session: PRESENTED });
    const middlewareRes = runMiddleware({ alkemio_session: PRESENTED });

    expect(observe(middlewareRes)).toEqual(observe(filterRes));
    // Pinned explicitly too, so the test cannot pass by both paths being
    // identically broken (e.g. both silently doing nothing).
    expect(filterRes.status).toHaveBeenCalledWith(503);
    expect(filterRes.setHeader).toHaveBeenCalledWith('Retry-After', '5');
    expect(filterRes.cookie).toHaveBeenCalledWith(
      'alkemio_session',
      PRESENTED,
      expect.objectContaining({ secure: true, maxAge: 1_209_600_000 })
    );
    expect(filterRes.clearCookie).not.toHaveBeenCalled();
  });

  it('the REST filter and the express middleware agree, no cookie presented', () => {
    // The cookie-less path must diverge from the cookie-bearing one only in
    // that no Set-Cookie is emitted — status and retry hint stay identical.
    const filterRes = runFilter({});
    const middlewareRes = runMiddleware({});

    expect(observe(middlewareRes)).toEqual(observe(filterRes));
    expect(filterRes.status).toHaveBeenCalledWith(503);
    expect(filterRes.setHeader).toHaveBeenCalledWith('Retry-After', '5');
    expect(filterRes.cookie).not.toHaveBeenCalled();
  });

  it('both paths write the identical body for the two non-GraphQL transports', () => {
    // G4 allows the body to differ by transport, but P1 and P2 are both plain
    // HTTP and share it; only the GraphQL arm (P3, elsewhere) differs.
    const filterRes = runFilter({ alkemio_session: PRESENTED });
    const middlewareRes = runMiddleware({ alkemio_session: PRESENTED });

    expect(middlewareRes.json.mock.calls).toEqual(filterRes.json.mock.calls);
    expect(filterRes.json).toHaveBeenCalledWith({
      error: 'session_store_unavailable',
    });
  });
});
