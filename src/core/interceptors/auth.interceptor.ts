import { LogContext } from '@common/enums';
import { AuthenticationException } from '@common/exceptions';
import { ActorContext } from '@core/actor-context/actor.context';
import { ActorContextService } from '@core/actor-context/actor.context.service';
import { clearSessionCookie } from '@core/auth/oidc/session-cookie';
import {
  BearerValidationError,
  CookieSessionInvalidError,
} from '@core/auth/oidc/strategies/auth.errors';
import {
  AUTH_STRATEGY_NON_INTERACTIVE_LOGIN,
  AUTH_STRATEGY_OIDC_COOKIE_SESSION,
  AUTH_STRATEGY_OIDC_HYDRA_BEARER,
} from '@core/auth/oidc/strategies/strategy.names';
import { X_GUEST_NAME_HEADER } from '@core/authentication/constants';
import {
  CallHandler,
  ContextType,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  NestInterceptor,
  Optional,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GqlExecutionContext } from '@nestjs/graphql';
import { AlkemioConfig } from '@src/types';
import type { Response } from 'express';
import { IncomingMessage } from 'http';
import passport from 'passport';
import { Observable } from 'rxjs';

/**
 * Reach the response object for either transport.
 *
 * Order matters, and the `req.res` fallback is the one that actually fires for
 * GraphQL. This app's Apollo context factory returns `{ req: ctx.req }` and
 * deliberately does NOT put `res` in the context (`app.module.ts`), so the
 * textbook `getContext().res` is `undefined` for every GraphQL request — i.e.
 * for nearly all traffic this interceptor guards. Express hangs the response
 * off the request, so `req.res` reaches it without changing the shared GraphQL
 * config.
 *
 * Returns `undefined` for graphql-ws subscriptions, which have no response to
 * write a header to. That is expected, not a failure.
 */
function getResponse(
  context: ExecutionContext,
  isGraphql: boolean,
  req: IncomingMessage | undefined
): Response | undefined {
  try {
    if (isGraphql) {
      const gqlContext = GqlExecutionContext.create(context).getContext();
      return gqlContext?.res ?? (gqlContext?.req as any)?.res ?? getReqRes(req);
    }
    return context.switchToHttp().getResponse() ?? getReqRes(req);
  } catch {
    return getReqRes(req);
  }
}

function getReqRes(req: IncomingMessage | undefined): Response | undefined {
  return (req as unknown as { res?: Response } | undefined)?.res;
}

/**
 * The OIDC routes that exist to establish or tear down a session, and so must
 * stay reachable when the caller's current session has just been rejected.
 *
 * Deliberately a closed list of exact paths rather than a prefix match: a
 * prefix would also cover `/api/auth/oidc/id-token-hint` and `/refresh`, which
 * DO read the session and must keep 401'ing. Matched against the path only —
 * `req.url` carries the query string (`/login?returnTo=…`), and a substring
 * test on the raw URL would let `?next=/api/auth/oidc/login` smuggle any route
 * past the check.
 */
const AUTH_ENTRY_POINT_PATHS = new Set([
  '/api/auth/oidc/login',
  '/api/auth/oidc/callback',
  '/api/auth/oidc/logout',
]);

function isAuthEntryPoint(req: IncomingMessage | undefined): boolean {
  const url = req?.url;
  if (typeof url !== 'string') return false;
  const path = url.split('?')[0].replace(/\/+$/, '') || '/';
  return AUTH_ENTRY_POINT_PATHS.has(path);
}

@Injectable()
export class AuthInterceptor implements NestInterceptor {
  /**
   * server#6315 — attributes for expiring the session cookie on a rejected
   * session. Optional so the several test harnesses that construct this
   * interceptor directly keep working; when absent the cookie is simply not
   * cleared and nothing else changes.
   */
  private readonly sessionCookie: {
    name: string;
    secure: boolean;
    domain?: string;
  } | null;

  constructor(
    private readonly actorContextService: ActorContextService,
    @Optional() configService?: ConfigService<AlkemioConfig, true>
  ) {
    const cookie = configService?.get(
      'identity.authentication.providers.oidc.cookie',
      { infer: true }
    );
    this.sessionCookie = cookie
      ? { name: cookie.name, secure: cookie.secure, domain: cookie.domain }
      : null;
  }

  async intercept(
    context: ExecutionContext,
    next: CallHandler
  ): Promise<Observable<any>> {
    const req = getRequest(context);
    if (!req) {
      return next.handle();
    }
    // If a guard has already authenticated the actor (e.g., MCP auth guard),
    // don't overwrite with a different authentication strategy
    const existingActor = req.user as ActorContext | undefined;
    if (existingActor?.actorID && !existingActor?.isAnonymous) {
      // Actor already authenticated by a guard - preserve that authentication
      return next.handle();
    }

    // FR-024b — three states:
    //   (a) no creds → strategy returns null → interceptor swaps in anonymous
    //   (b) invalid creds → strategy throws → interceptor maps to 401
    //   (c) valid creds → strategy returns ActorContext → set on req.user
    let resolved: ActorContext | undefined;
    try {
      resolved = await passportAuthenticate(req);
    } catch (err) {
      if (
        err instanceof BearerValidationError ||
        err instanceof CookieSessionInvalidError
      ) {
        const errorCode =
          (err as { errorCode?: string }).errorCode ?? 'unauthenticated';
        const isGraphql =
          context.getType<ContextType | 'graphql'>() === 'graphql';

        // server#6315 — a rejected cookie session takes its cookie with it.
        //
        // Without this the browser keeps presenting a cookie the server will
        // never accept again, and since this interceptor is global that 401
        // covers EVERY route — including `/api/auth/oidc/login`. The holder is
        // then unable to sign in again, as themselves or as anyone else on that
        // machine, with no recovery but clearing cookies by hand. The lockout
        // lasts as long as the rejected payload lives: 5 minutes for a
        // tombstone, but up to the full 14-day idle window for a session the
        // subject-revocation marker rejects (its payload is untouched and
        // healthy — see CookieSessionStrategy).
        //
        // Only for `CookieSessionInvalidError`. A `BearerValidationError` is
        // about an Authorization header and has no business clearing cookies.
        //
        // Deliberately NOT done for `SessionStoreUnavailableError`: that path
        // has its own filter which re-asserts the cookie precisely so the jar
        // stays warm across a transient Redis outage. Clearing on a blip would
        // sign the whole platform out. "Session ended" clears; "store briefly
        // unreachable" does not, and this is the line between them.
        if (err instanceof CookieSessionInvalidError && this.sessionCookie) {
          clearSessionCookie(
            getResponse(context, isGraphql, req),
            this.sessionCookie
          );

          // …and the routes whose entire job is to fix this state are let
          // through as anonymous rather than 401'd.
          //
          // Clearing the cookie alone leaves one broken click: a browser whose
          // FIRST action after a revocation is hitting /login gets a 401 JSON
          // page, because the clear rides on that same rejected response. The
          // cookie is gone by then, so a second attempt succeeds — but "click
          // sign in twice" is not a fixed sign-in. Measured on a running
          // platform, which is the only reason this branch exists.
          //
          // Safe by construction: none of these three routes reads an
          // authenticated actor. `/login` builds an authorize URL and redirects,
          // `/callback` regenerates the session from scratch, and `/logout`
          // tears down whatever is left. Continuing as anonymous is what they
          // would do for a first-time visitor anyway.
          if (isAuthEntryPoint(req)) {
            req.user = this.resolveUnauthenticated(req);
            return next.handle();
          }
        }
        if (isGraphql) {
          // GraphQL semantics: throw AuthenticationException (extends BaseException
          // → GraphQLError) so the GraphQL errors envelope carries
          // `extensions.code: "UNAUTHENTICATED"` + `extensions.error_code: <code>`
          // AND the constructor sets `extensions.http.status: 401` so Apollo
          // Server v4 emits wire-level HTTP 401 alongside the envelope.
          // Stage-1 exit log finding G — fixed by AuthenticationException
          // carrying http.status; previously HttpException landed in
          // HttpExceptionFilter which bails on graphql context, leaving
          // Apollo's default HTTP 200 in place.
          throw new AuthenticationException(
            'unauthenticated',
            LogContext.AUTH_TOKEN,
            undefined,
            errorCode
          );
        }
        // HTTP semantics: plain 401.
        throw new HttpException(
          { statusCode: HttpStatus.UNAUTHORIZED, error_code: errorCode },
          HttpStatus.UNAUTHORIZED
        );
      }
      // Other errors (e.g. SessionStoreUnavailableError → handled by its own
      // exception filter; AuthenticationException — rethrow to keep current
      // semantics).
      throw err;
    }
    req.user = resolved ?? this.resolveUnauthenticated(req);
    return next.handle();
  }

  /**
   * No session/bearer resolved. a public client
   * (e.g. the guest-share whiteboard SPA) self-identifies with a display name
   * in the `x-guest-name` header so per-resource guest-access policies can
   * grant it `GLOBAL_GUEST`. Otherwise fall back to anonymous.
   */
  private resolveUnauthenticated(req: IncomingMessage): ActorContext {
    const guestName = decodeGuestNameHeader(req);
    if (guestName) {
      return this.actorContextService.createGuest(guestName);
    }
    return this.actorContextService.createAnonymous();
  }
}

/**
 * Reads the `x-guest-name` header and base64-decodes it. The client encodes
 * the name (Unicode-safe) because HTTP headers are ISO-8859-1 only, so names
 * like `李明` cannot ride the wire raw. Returns the trimmed name, or undefined
 * when the header is absent, malformed, or empty after decode.
 */
const decodeGuestNameHeader = (req: IncomingMessage): string | undefined => {
  const raw = req.headers?.[X_GUEST_NAME_HEADER];
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (typeof value !== 'string' || value.length === 0) {
    return undefined;
  }
  try {
    const decoded = Buffer.from(value, 'base64').toString('utf-8').trim();
    return decoded.length > 0 ? decoded : undefined;
  } catch {
    return undefined;
  }
};

const getRequest = (context: ExecutionContext) => {
  const contextType = context.getType<ContextType | 'graphql' | 'rmq'>();

  // Skip RPC contexts (NestJS microservices) - no HTTP request available
  if (contextType === 'rpc') {
    return undefined;
  }

  // Skip RabbitMQ contexts from @golevelup/nestjs-rabbitmq
  if (contextType === 'rmq') {
    return undefined;
  }

  if (contextType === 'graphql') {
    return GqlExecutionContext.create(context).getContext<IGraphQLContext>()
      .req;
  }

  // For HTTP context, verify we have a proper request with headers
  // This also handles cases where other transports report as 'http' but have no actual request
  const req = context.switchToHttp().getRequest();
  if (!req?.headers?.authorization && !req?.headers?.cookie) {
    // No auth-related headers - likely not a real HTTP request
    // Check if it looks like an HTTP request at all
    if (!req?.method || !req?.url) {
      return undefined;
    }
  }

  return req;
};

// Promisified passport.authenticate
const passportAuthenticate = async (req: IncomingMessage) => {
  return new Promise<ActorContext | undefined>((resolve, reject) => {
    // T042b — cookie-session OR non-interactive-login OR hydra-bearer.
    // Browser sessions take the cookie path; clients bearing an HS256 token
    // signed with NON_INTERACTIVE_LOGIN_SIGNING_KEY take the
    // non-interactive-login path; standard API clients (Hydra-issued RS256
    // JWTs) take the Bearer path. Strategies tried in order; first non-null
    // user wins.
    //
    // Order is important: `hydra-bearer` THROWS BearerValidationError when a
    // bearer is present but the alg does not match its JWKS (RS256), which
    // 401s the request before `non-interactive-login` ever runs. So we must
    // try the HS256 path first. The non-interactive-login strategy does a
    // cheap header-alg pre-check and returns null on anything that isn't
    // HS256, so RS256 Hydra tokens fall through cleanly.
    //
    // The non-interactive-login strategy is always registered with passport
    // but is inert (returns null) unless NonInteractiveLoginConfig.enabled —
    // see the non-interactive-login module for the gate.
    passport.authenticate(
      [
        AUTH_STRATEGY_OIDC_COOKIE_SESSION,
        AUTH_STRATEGY_NON_INTERACTIVE_LOGIN,
        AUTH_STRATEGY_OIDC_HYDRA_BEARER,
      ],
      // session: false — passport never writes to express-session here.
      // The cookie-session strategy reads `alkemio_session` itself.
      { session: false },
      (
        err: Error | string | null,
        user: ActorContext,
        info?: object | string | Array<string | undefined>,
        status?: number | Array<number | undefined>
      ) => {
        // 'err' is typically null unless an exception occurs in the strategy.
        // 'user' is the object returned from the strategy's validate() method, or false if auth failed.
        // 'info' contains details like error messages (e.g., 'No auth token') or expiration info.
        if (err) {
          // FR-024b — preserve known auth-error types so the interceptor can
          // discriminate them via `instanceof`. Wrap only unknown errors.
          if (
            err instanceof BearerValidationError ||
            err instanceof CookieSessionInvalidError
          ) {
            reject(err);
            return;
          }
          reject(
            new AuthenticationException(
              (err as Error)?.message ?? String(err),
              LogContext.AUTH,
              { status, info }
            )
          );
          return;
        }
        // Passport yields `false` when the strategy returns null (e.g. no
        // session cookie). Normalize to undefined; the interceptor swaps it
        // for an anonymous ActorContext.
        resolve(user || undefined);
      }
      // Important: Pass only 'req'. Passport's callback signature here doesn't need res/next.
      // The invocation `(req)` executes the authentication logic for the given request.
    )(req);
  });
};
