import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  Inject,
  LoggerService,
  HttpException,
} from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Response } from 'express';
import { BaseHttpException } from '@common/exceptions/http';
import { RestErrorResponse } from './rest.error.response';
import { HttpContext } from '@src/types';
import { LogContext } from '@common/enums';
import { ContextTypeWithGraphQL } from '@src/types/context.type';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  catch(exception: BaseHttpException, host: ArgumentsHost) {
    if (host.getType<ContextTypeWithGraphQL>() !== 'http') {
      this.logger.error(
        `Exception '${exception.name}' probably thrown in the wrong execution context`,
        undefined,
        LogContext.NEST_FILTER
      );

      return exception;
    }

    const httpArguments = host.switchToHttp();
    const response = httpArguments.getResponse<Response<RestErrorResponse>>();
    const req = httpArguments.getRequest<HttpContext['req']>();
    const status = exception.getStatus();
    let userID = 'unknown';
    if (req.user) {
      userID = req.user.userID;
    }

    exception.details = {
      ...exception.details,
      userId: userID,
    };
    const loggableException = {
      ...exception,
      stack: String(exception.stack),
    };
    this.logger.error(loggableException);

    response.status(status).json({
      statusCode: status,
      code: exception.code,
      timestamp: new Date().toISOString(),
      message: exception.message,
      errorId: exception.errorId,
      context:
        process.env.NODE_ENV !== 'production' ? exception.context : undefined,
      details:
        process.env.NODE_ENV !== 'production' ? exception.details : undefined,
    });
    // something needs to be returned so the default ExceptionsHandler is not triggered
    return exception;
  }
}
