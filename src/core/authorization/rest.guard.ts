import {
  Injectable,
  Inject,
  LoggerService,
  ExecutionContext,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { AuthenticationException } from '@common/exceptions';
import { LogContext } from '@common/enums/logging.context';
import { Observable } from 'rxjs';

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

  // // Need to override base method for graphql requests
  // getRequest(context: ExecutionContext) {
  //   return context.switchToHttp().getRequest();
  // }

  canActivate(
    context: ExecutionContext
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();
    this.logger.verbose?.(
      `Request received: ${JSON.stringify(request)}`,
      LogContext.AUTH
    );
    return true;
  }

  handleRequest(
    err: any,
    agentInfo: any,
    _: any,
    _context: any,
    _status?: any
  ) {
    if (err) {
      this.logger.error(`error: ${err}`, LogContext.AUTH);
      throw new AuthenticationException(err);
    }
    return agentInfo;
  }
}
