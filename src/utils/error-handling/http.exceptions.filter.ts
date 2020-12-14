import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  Injectable,
  Inject,
  LoggerService,
} from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { LogContext } from '../logging/logging.contexts';
import { BaseException } from './exceptions/base.exception';

@Injectable()
@Catch()
export class HttpExceptionsFilter implements ExceptionFilter {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  catch(exception: BaseException, _host: ArgumentsHost) {
    // toDo vyanakiev - discuss the contextual information provided in the logged unhandled exceptions
    // const gqlHost = GqlArgumentsHost.create(host);
    // const req = gqlHost.getContext().req;
    // const url = req.originalUrl;

    let context = LogContext.UNSPECIFIED;

    //short-circuit favicon. We don't serve static content. Once data-management is removed from this server, remove this.
    if (exception.message.includes('favicon')) return exception;

    if (exception.getContext) context = exception.getContext();

    this.logger.error(exception.message, exception.stack, context);

    return exception;
  }
}
