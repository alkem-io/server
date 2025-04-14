import {
  CallHandler,
  ContextType,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import passport from 'passport';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
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
  if (context.getType<ContextType | 'graphql'>() === 'graphql') {
    return GqlExecutionContext.create(context).getContext<IGraphQLContext>()
      .req;
  }
  return context.switchToHttp().getRequest();
};

// Promisified passport.authenticate
const passportAuthenticate = async (req: IncomingMessage) => {
  return new Promise<AgentInfo>((resolve, reject) => {
    // Use the same passport strategy ('jwt') and options
    passport.authenticate(
      [AUTH_STRATEGY_OATHKEEPER_JWT, AUTH_STRATEGY_OATHKEEPER_API_TOKEN],
      // session: false option is crucial for stateless JWT authentication
      { session: false },
      (
        err: Error | string | null,
        user: AgentInfo,
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
