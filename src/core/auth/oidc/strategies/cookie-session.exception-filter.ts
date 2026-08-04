import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AlkemioConfig } from '@src/types';
import type { NextFunction, Request, Response } from 'express';
import { readPresentedCookie } from '../session-id.resolver';
import { SessionStoreUnavailableError } from './cookie-session.errors';

/**
 * The full attribute set the session cookie is issued with.
 *
 * server#6332 — re-asserting with a SUBSET is worse than not re-asserting at
 * all. The shipped version set only `httpOnly`, `sameSite` and `path`; in any
 * deployment where the cookie is `secure` and domain-scoped that told the
 * browser to replace a Secure, domain-scoped, 14-day cookie with a non-Secure,
 * host-only, browser-session one. Dropping `secure` is a security downgrade
 * triggered by a Redis blip, dropping `domain` shadows the real cookie so it
 * stops being sent, and dropping `maxAge` silently shortens every affected
 * user's session. Each inverts the purpose of re-asserting. Research R11.
 */
export interface SessionCookieAttributes {
  name: string;
  secure: boolean;
  domain?: string;
  /**
   * Milliseconds. Optional ONLY so a harness that knows just the cookie name
   * can omit it — production always supplies it.
   *
   * It must never be 0: express turns `maxAge: 0` into `Expires` at the epoch,
   * which CLEARS the cookie. That is the exact outcome FR-020 exists to
   * prevent, so the application below applies it only when positive.
   */
  maxAge?: number;
  sameSite: 'lax';
  path: '/';
  httpOnly: true;
}

/** Build the attribute set from the OIDC config block — one derivation, reused. */
export const sessionCookieAttributesFrom = (oidcConfig: {
  cookie: {
    name: string;
    secure: boolean;
    domain?: string;
    idle_ttl_s: number;
  };
}): SessionCookieAttributes => ({
  name: oidcConfig.cookie.name,
  secure: oidcConfig.cookie.secure,
  domain: oidcConfig.cookie.domain || undefined,
  maxAge: oidcConfig.cookie.idle_ttl_s * 1000,
  sameSite: 'lax',
  path: '/',
  httpOnly: true,
});

/**
 * THE definition of what a store-unavailable response looks like on the wire.
 *
 * FR-022b — 503 + `Retry-After: 5`, NO Set-Cookie clearing (no max-age=0), NO
 * redirect. The same cookie value is re-asserted so the client's cookie jar
 * stays warm across the transient outage; that is what distinguishes a
 * "transient store outage" response from a "session ended" teardown on the
 * wire, and it is why a Redis blip must not present to a SPA as a forced
 * logout.
 *
 * Three different layers can be the one that discovers the store is
 * unreachable — the express session middleware (pre-Nest, any transport), the
 * Nest REST filter, and the AuthInterceptor's GraphQL arm — and a client must
 * not be able to tell which. This function is what stops them drifting
 * (FR-021).
 *
 * It sets the header and the cookie, and deliberately NOT the status or the
 * body: those differ by transport by design. Requiring byte-identical bodies
 * would mean either emitting a GraphQL envelope from a middleware that runs
 * before GraphQL exists, or stripping the envelope from responses where clients
 * rely on it. FR-021 governs what a client ACTS on — status, retry hint, cookie
 * — and those are identical. Spec Clarification Q16.
 */
export function applyStoreUnavailableResponse(
  // Deliberately a structural shape rather than an express `Request`: the
  // AuthInterceptor holds an `IncomingMessage`, and widening here is more
  // honest than casting there.
  req:
    | { cookies?: Record<string, unknown>; headers?: { cookie?: string } }
    | undefined,
  res: Response | undefined,
  cookie: SessionCookieAttributes
): boolean {
  if (!res || typeof res.cookie !== 'function') {
    // The GraphQL path can legitimately have no express response to hand (this
    // application's Apollo context factory returns `{ req }` and never `res`).
    // The status still reaches the client through the exception's
    // `extensions.http.status`; only the header and cookie are lost, and
    // failing to answer at all would be worse.
    return false;
  }

  // A response that has already been flushed cannot be rewritten: `setHeader`
  // and `cookie` both throw `ERR_HTTP_HEADERS_SENT`, and one of the callers
  // reaches here from a `setImmediate` (express-session defers `next(err)` for
  // a failed `store.set` / `store.destroy` on the `res.end` path), where a
  // throw is an UNCAUGHT exception and kills the process. `clearSessionCookie`
  // guards the same way for the same reason.
  if (res.headersSent) {
    return false;
  }

  const presented = readPresentedCookie(req ?? {}, cookie.name);
  if (presented !== null) {
    // The RAW SIGNED value exactly as presented, so no re-signing occurs and
    // the signing secret is not needed at the response site. If no cookie was
    // presented, none is set — we do not invent one.
    res.cookie(cookie.name, presented, {
      httpOnly: cookie.httpOnly,
      sameSite: cookie.sameSite,
      path: cookie.path,
      secure: cookie.secure,
      ...(cookie.domain ? { domain: cookie.domain } : {}),
      // Guarded: `maxAge: 0` would expire the cookie at the epoch, i.e. clear
      // it — the precise opposite of this function's purpose.
      ...(typeof cookie.maxAge === 'number' && cookie.maxAge > 0
        ? { maxAge: cookie.maxAge }
        : {}),
    });
  }

  res.setHeader('Retry-After', '5');
  return true;
}

/** The transport-specific body shared by the two non-GraphQL paths. */
const STORE_UNAVAILABLE_BODY = { error: 'session_store_unavailable' } as const;

// Nest REST path. Unchanged in behaviour from 107-oidc-session-revocation
// except for the cookie attributes (which were incomplete).
//
// NOTE it does NOT serve the GraphQL path, and cannot: `host.switchToHttp()`
// on a GraphQL request returns the GraphQL root and args rather than a request
// and response. That is why adding SessionStoreUnavailableError to the
// interceptor's allow-list is necessary but not sufficient, and why the
// interceptor owns the GraphQL arm. Research R9.
@Injectable()
@Catch(SessionStoreUnavailableError)
export class CookieSessionStoreUnavailableFilter implements ExceptionFilter {
  private readonly cookie: SessionCookieAttributes;

  constructor(configService: ConfigService<AlkemioConfig, true>) {
    this.cookie = sessionCookieAttributesFrom(
      configService.get('identity.authentication.providers.oidc', {
        infer: true,
      })
    );
  }

  catch(_exception: SessionStoreUnavailableError, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    // `applyStoreUnavailableResponse` deliberately tolerates an absent or
    // already-flushed response; the status/body write has to agree with it or
    // the two disagree about whether there is a response to write at all.
    if (
      !applyStoreUnavailableResponse(
        ctx.getRequest<Request>(),
        res,
        this.cookie
      )
    ) {
      return;
    }
    res.status(503).json(STORE_UNAVAILABLE_BODY);
  }
}

/**
 * Raw express path — the session middleware's own store read.
 *
 * server#6332 FR-016a: `express-session` reads the store for any request
 * carrying a session cookie, before any authentication code runs, and calls
 * `next(err)` on failure. Registered directly after the session middleware in
 * `main.server.ts`, this is what stops that becoming an HTML 500.
 *
 * Accepts the full attribute set rather than just a name so the cookie it
 * re-asserts is the cookie that was issued.
 */
export const cookieSessionStoreUnavailableMiddleware =
  (cookie: SessionCookieAttributes | string) =>
  (err: unknown, req: Request, res: Response, next: NextFunction): void => {
    if (!(err instanceof SessionStoreUnavailableError)) {
      // Anything else is none of our business — pass it on rather than
      // swallowing it behind a 503 that would misdescribe it.
      next(err);
      return;
    }

    // The response may already be on the wire. `express-session` does not only
    // read the store on the way IN: a failed `store.set` / `store.destroy` on
    // the `res.end` path is reported with `defer(next, err)`, i.e. from a
    // `setImmediate` AFTER the headers have been flushed. Writing there throws
    // `ERR_HTTP_HEADERS_SENT` with no request-scoped catch above it, which is
    // an uncaught exception and takes the process down — turning the outage
    // this middleware exists to soften into a crash loop. Hand it to express's
    // final handler, which knows how to deal with a half-sent response.
    if (!applyStoreUnavailableResponse(req, res, normalise(cookie))) {
      next(err);
      return;
    }
    res.status(503).json(STORE_UNAVAILABLE_BODY);
  };

/**
 * Tolerate a bare cookie name.
 *
 * Test harnesses pin a harness-local name and have no config block to derive
 * attributes from; production passes the real attribute set. The defaults here
 * are the non-Secure, host-only ones a bare name implies, which is exactly what
 * a harness wants and exactly what production must not get — hence production
 * passes the full object.
 */
const normalise = (
  cookie: SessionCookieAttributes | string
): SessionCookieAttributes =>
  typeof cookie === 'string'
    ? {
        name: cookie,
        secure: false,
        // No maxAge: omitting it re-asserts as a browser-session cookie, which
        // is the harness's own shape. Setting 0 would CLEAR it.
        sameSite: 'lax',
        path: '/',
        httpOnly: true,
      }
    : cookie;
