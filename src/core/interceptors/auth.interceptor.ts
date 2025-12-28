import {
  CallHandler,
  ContextType,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import passport from 'passport';
import { ActorContext } from '@core/actor-context';
import { AuthenticationException } from '@common/exceptions';
import { LogContext } from '@common/enums';
import { Observable } from 'rxjs';
import { GqlExecutionContext } from '@nestjs/graphql';
import {
  AUTH_STRATEGY_OATHKEEPER_API_TOKEN,
  AUTH_STRATEGY_OATHKEEPER_JWT,
} from '@core/authentication';
import { IncomingMessage } from 'http';

@Injectable()
export class AuthInterceptor implements NestInterceptor {
  async intercept(
    context: ExecutionContext,
    next: CallHandler
  ): Promise<Observable<any>> {
    const req = getRequest(context);
    if (!req) {
      return next.handle();
    }
    // attach the resolved user
    req.user = await passportAuthenticate(req);
    // pass control to the next interceptor
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
  return new Promise<ActorContext>((resolve, reject) => {
    // Use the same passport strategy ('jwt') and options
    passport.authenticate(
      [AUTH_STRATEGY_OATHKEEPER_JWT, AUTH_STRATEGY_OATHKEEPER_API_TOKEN],
      // session: false option is crucial for stateless JWT authentication
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
        resolve(user);
      }
      // Important: Pass only 'req'. Passport's callback signature here doesn't need res/next.
      // The invocation `(req)` executes the authentication logic for the given request.
    )(req);
  });
};
