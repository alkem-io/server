import { randomUUID } from 'crypto';
import {
  ExceptionFilter,
  Catch,
  Inject,
  LoggerService,
  ArgumentsHost,
} from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { ContextTypeWithGraphQL } from '@src/types/context.type';

@Catch(Error)
export class UnhandledExceptionFilter implements ExceptionFilter {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  catch(exception: Error, host: ArgumentsHost) {
    /* add values that you want to include as additional data
     e.g. secondParam = { code: '123' };
    */
    const secondParam = { errorId: randomUUID() };
    const thirdParam = undefined;
    /* the logger will handle the passed exception by iteration over all it's fields
     * you can provide additional data in the stack and context
     */
    this.logger.error(exception, secondParam, thirdParam);

    const contextType = host.getType<ContextTypeWithGraphQL>();
    // If we are in an http context respond something so the browser doesn't stay hanging.
    if (contextType === 'http') {
      const httpArguments = host.switchToHttp();
      const response = httpArguments.getResponse();

      response.status(500).json({
        statusCode: 500,
        timestamp: new Date().toISOString(),
        errorId: secondParam.errorId,
        name:
          process.env.NODE_ENV !== 'production' ? exception.name : undefined,
        message:
          process.env.NODE_ENV !== 'production'
            ? exception.message
            : 'Internal Server Error',
        stack:
          process.env.NODE_ENV !== 'production' ? exception.stack : undefined,
      });
    }
    // something needs to be returned so the default ExceptionsHandler is not triggered
    return exception;
  }
}
