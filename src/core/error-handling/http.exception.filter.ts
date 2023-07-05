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
import { RestErrorResponse } from './rest.error.response';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response<RestErrorResponse>>();
    const status = exception.getStatus();

    this.logger.error(exception.message, exception.stack);

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      message: exception.message,
      stack:
        process.env.NODE_ENV !== 'production' ? exception.stack : undefined,
    });
  }
}
