import {
  Inject,
  Injectable,
  LoggerService,
  NestMiddleware,
} from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { AuthenticationService } from '@core/authentication/authentication.service';
import passport from 'passport';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { AuthenticationException } from '@common/exceptions';
import { LogContext } from '@common/enums';
import {
  AUTH_STRATEGY_OATHKEEPER_JWT,
  AUTH_STRATEGY_OATHKEEPER_API_TOKEN,
} from '@core/authentication';

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  constructor() {}

  async use(req: Request, res: Response, next: NextFunction) {
    /**
     * 1. the 'authenticate' method invokes the named strategies with the given options
     * 2. invokes the callback after the validate() method of the strategy is called
     */
    passport.authenticate(
      [AUTH_STRATEGY_OATHKEEPER_JWT, AUTH_STRATEGY_OATHKEEPER_API_TOKEN],
      // session: false option is crucial for stateless JWT authentication
      { session: false },
      async (
        err: Error | string | null,
        user: AgentInfo,
        info?: object | string | Array<string | undefined>,
        status?: number | Array<number | undefined>
      ) => {
        // 'err' is typically null unless an exception occurs in the strategy.
        // 'user' is the object returned from the strategy's validate() method, or false if auth failed.
        // 'info' contains details like error messages (e.g., 'No auth token') or expiration info.
        if (err) {
          throw new AuthenticationException(
            (err as Error)?.message ?? String(err),
            LogContext.AUTH,
            { status, info }
          );
        }
        // attach the resolved user
        req.user = user;
        // pass control to the next middleware
        next();
      }
    )(req, res, next); // Immediately invoke the middleware function returned by passport.authenticate
  }
}
