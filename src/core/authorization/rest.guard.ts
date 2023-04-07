import { Injectable, Inject, LoggerService } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { AuthenticationException } from '@common/exceptions';
import { LogContext } from '@common/enums/logging.context';
import { AgentInfo } from '@core/authentication';

@Injectable()
export class RestGuard extends AuthGuard([
  'oathkeeper-jwt',
  'oathkeeper-api-token',
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
  handleRequest<T extends AgentInfo>(
    err: any,
    agentInfo: T,
    _: any,
    _context: any,
    _status?: any
  ): T {
    if (err) {
      this.logger.error(`error: ${err}`, LogContext.AUTH);
      throw new AuthenticationException(err);
    }

    // authorize the access to the requested resource...

    return agentInfo;
  }
}
