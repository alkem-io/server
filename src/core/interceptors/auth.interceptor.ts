import { LogContext } from '@common/enums';
import { AuthenticationException } from '@common/exceptions';
import { ActorContext } from '@core/actor-context/actor.context';
import { ActorContextService } from '@core/actor-context/actor.context.service';
import { AUTH_STRATEGY_OIDC_COOKIE_SESSION } from '@core/auth/oidc/strategies/strategy.names';
import {
  CallHandler,
  ContextType,
  ExecutionContext,
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
    // Always attach a valid ActorContext — anonymous when unauthenticated —
    // so downstream resolvers, decorators (CurrentActor) and DataLoaders can
    // safely read `req.user.actorID`/`credentials` without null guards.
    const resolved = await passportAuthenticate(req);
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
    // T042a — cookie-session only. T042b appends 'hydra-bearer' to this
    // chain once the Bearer strategy lands (atomic with T043/T044 cutover).
    passport.authenticate(
      [AUTH_STRATEGY_OIDC_COOKIE_SESSION],
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
          reject(
            new AuthenticationException(
              (err as Error)?.message ?? String(err),
              LogContext.AUTH,
              { status, info }
            )
          );
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
