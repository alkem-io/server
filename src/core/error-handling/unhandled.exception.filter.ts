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
    } else if (contextType === 'graphql') {
      if (process.env.NODE_ENV === 'production') {
        // return a new error with only the message and the id
        // that way we are not exposing any internal information
        return new GraphQLError(exception.message, {
          extensions: {
            errorId: secondParam.errorId,
            code: AlkemioErrorStatus.UNSPECIFIED,
          },
        });
      }
      // if not in PROD, return everything
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
