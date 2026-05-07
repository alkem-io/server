import { LogContext } from '@common/enums';
import { AuthenticationException } from '@common/exceptions';
import { ActorContext } from '@core/actor-context/actor.context';
import { ActorContextService } from '@core/actor-context/actor.context.service';
import {
  BearerValidationError,
  CookieSessionInvalidError,
} from '@core/auth/oidc/strategies/auth.errors';
import {
  AUTH_STRATEGY_OIDC_COOKIE_SESSION,
  AUTH_STRATEGY_OIDC_HYDRA_BEARER,
} from '@core/auth/oidc/strategies/strategy.names';
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
    req.user = resolved ?? this.actorContextService.createAnonymous();
    return next.handle();
  }
}

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
    // T042b — cookie-session OR hydra-bearer. Browser sessions take the
    // cookie path; non-interactive API clients (Hydra-issued JWTs) take the
    // Bearer path. Strategies tried in order; first non-null user wins.
    passport.authenticate(
      [AUTH_STRATEGY_OIDC_COOKIE_SESSION, AUTH_STRATEGY_OIDC_HYDRA_BEARER],
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
