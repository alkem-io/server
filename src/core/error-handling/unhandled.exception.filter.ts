import { AlkemioErrorStatus } from '@common/enums';
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  Inject,
  LoggerService,
} from '@nestjs/common';
import { ContextTypeWithGraphQL } from '@src/types/context.type';
import { randomUUID } from 'crypto';
import { GraphQLError } from 'graphql';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { isErrorResponseDebugEnabled } from './error.response.debug';
import { INTERNAL_SERVER_ERROR_MESSAGE } from './public.error.result';

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
    const secondParam = {
      stack: String(exception.stack),
      errorId: randomUUID(),
    };
    const thirdParam = 'UnhandledException';
    /* the logger will handle the passed exception by iteration over all it's fields
     * you can provide additional data in the stack and context
     */
    this.logger.error(exception, secondParam, thirdParam);

    const debug = isErrorResponseDebugEnabled();
    const contextType = host.getType<ContextTypeWithGraphQL>();
    // If we are in an http context respond something so the browser doesn't stay hanging.
    if (contextType === 'http') {
      const httpArguments = host.switchToHttp();
      const response = httpArguments.getResponse();

      response.status(500).json({
        statusCode: 500,
        timestamp: new Date().toISOString(),
        errorId: secondParam.errorId,
        name: debug ? exception.name : undefined,
        message: debug ? exception.message : INTERNAL_SERVER_ERROR_MESSAGE,
        stack: debug ? exception.stack : undefined,
      });
    } else if (contextType === 'graphql') {
      if (!debug) {
        return new GraphQLError(INTERNAL_SERVER_ERROR_MESSAGE, {
          extensions: {
            errorId: secondParam.errorId,
            code: AlkemioErrorStatus.UNSPECIFIED,
          },
        });
      }
      return new GraphQLError(exception.message, {
        originalError: exception,
        extensions: {
          errorId: secondParam.errorId,
          code: AlkemioErrorStatus.UNSPECIFIED,
        },
      });
    }
    // something needs to be returned so the default ExceptionsHandler is not triggered
    return exception;
  }
}
