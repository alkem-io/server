import { LogContext } from '@common/enums';
import { AuthenticationException } from '@common/exceptions';
import { ActorContext } from '@core/actor-context/actor.context';
import { ActorContextService } from '@core/actor-context/actor.context.service';
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
} from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { IncomingMessage } from 'http';
import passport from 'passport';
import { Observable } from 'rxjs';

@Injectable()
export class AuthInterceptor implements NestInterceptor {
  constructor(private readonly actorContextService: ActorContextService) {}

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
