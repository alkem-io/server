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

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  catch(exception: BaseHttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response<RestErrorResponse>>();
    const status = exception.getStatus();

    /* add values in 'stack' that you want to include as additional data
     e.g. stack = { code: '123' };
    */
    const stack = { code: exception.code };
    const context = exception.context;

    /* the logger will handle the passed exception by iteration over all it's fields
     * you can provide additional data in the stack and context
     */
    this.logger.error(exception, stack, context);

    response.status(status).json({
      statusCode: status,
      code: exception.code,
      timestamp: new Date().toISOString(),
      message: exception.message,
      context: process.env.NODE_ENV !== 'production' ? context : undefined,
      stack:
        process.env.NODE_ENV !== 'production' ? exception.stack : undefined,
    });
    // something needs to be returned so the default ExceptionsHandler is not triggered
    return exception;
  }
}
