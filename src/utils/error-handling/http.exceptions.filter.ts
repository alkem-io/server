import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  Injectable,
  Inject,
  LoggerService,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { ILoggingConfig } from '../../interfaces/logging.config.interface';
import { LogContext } from '../logging/logging.contexts';
import { BaseException } from './exceptions/base.exception';

@Injectable()
@Catch()
export class HttpExceptionsFilter implements ExceptionFilter {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    private configService: ConfigService
  ) {}

  catch(exception: BaseException, _host: ArgumentsHost) {
    // toDo vyanakiev - discuss the contextual information provided in the logged unhandled exceptions
    // const gqlHost = GqlArgumentsHost.create(host);
    // const req = gqlHost.getContext().req;
    // const url = req.originalUrl;

    let context = LogContext.UNSPECIFIED;

    if (exception.getContext) context = exception.getContext();
    const loggingExceptionsEnabled = this.configService.get<ILoggingConfig>(
      'logging'
    )?.loggingExceptionsEnabled as boolean;

    if (loggingExceptionsEnabled)
      this.logger.error(exception.message, exception.stack, context);

    return exception;
  }
}
