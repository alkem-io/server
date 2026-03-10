import { LogContext } from '@common/enums/logging.context';
import { ForbiddenHttpException } from '@common/exceptions/http';
import { ActorContext } from '@core/actor-context/actor.context';
import {
  AUTH_STRATEGY_OATHKEEPER_API_TOKEN,
  AUTH_STRATEGY_OATHKEEPER_JWT,
} from '@core/authentication';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

@Injectable()
export class RestGuard extends AuthGuard([
  AUTH_STRATEGY_OATHKEEPER_JWT,
  AUTH_STRATEGY_OATHKEEPER_API_TOKEN,
]) {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {
    super();
  }
  /**
     if *canActive* is defined the authorization WILL NOT GO through the defined strategies, and use the code here instead.
     if **handleRequest* is defined WILL USE the defined strategies

     *handleRequest* is used to extend the error handling or how the request iis handled
     Based on the GraphqlGuard, this guard must also execute an authorization rule against the access resource
   */
  handleRequest<T extends ActorContext>(
    err: any,
    actorContext: T,
    _: any,
    _context: any,
    _status?: any
  ): T {
    if (err) {
      throw new ForbiddenHttpException(
        err?.message ?? String(err),
        LogContext.AUTH
      );
    }

    // authorize the access to the requested resource...

    return actorContext;
  }
}
