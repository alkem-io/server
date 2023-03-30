import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  Injectable,
  Inject,
  LoggerService,
} from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { LogContext } from '@common/enums';
import { BaseException } from '@common/exceptions/base.exception';

@Injectable()
@Catch()
export class HttpExceptionsFilter implements ExceptionFilter {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  catch(exception: BaseException, _host: ArgumentsHost) {
    // toDo vyanakiev - discuss the contextual information provided in the logged unhandled exceptions
    // const gqlHost = GqlArgumentsHost.create(host);
    // const req = gqlHost.getContext().req;
    // const url = req.originalUrl;

    let context = LogContext.UNSPECIFIED;

    if (exception.getContext) context = exception.getContext();

    this.logger.error(
      exception.message,
      JSON.stringify(exception.stack),
      context
    );

    return exception;
  }
}
