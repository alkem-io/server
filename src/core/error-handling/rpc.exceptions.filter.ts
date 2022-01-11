import {
  Catch,
  ArgumentsHost,
  RpcExceptionFilter,
  Inject,
  LoggerService,
} from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { LogContext } from '@common/enums';
import { RpcException } from '@nestjs/microservices';
import { Observable, throwError } from 'rxjs';

@Catch(RpcException)
export class ExceptionFilter implements RpcExceptionFilter<RpcException> {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  catch(exception: RpcException, _host: ArgumentsHost): Observable<any> {
    this.logger.error(
      exception.message,
      exception.stack,
      LogContext.UNSPECIFIED
    );

    return throwError(exception.getError());
  }
}
