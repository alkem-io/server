import { ArgumentsHost, Catch, Inject, LoggerService } from '@nestjs/common';
import { GqlExceptionFilter } from '@nestjs/graphql';
import { GraphQLError } from 'graphql';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { BaseException } from '@common/exceptions/base.exception';

@Catch(GraphQLError)
export class GraphqlExceptionFilter implements GqlExceptionFilter {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  catch(exception: BaseException, host: ArgumentsHost) {
    const httpArguments = host.switchToHttp();
    const ctx = httpArguments.getNext<IGraphQLContext>();
    exception.details = {
      ...exception.details,
      userId: ctx.req.user.userID,
    };
    /* add values that you want to include as additional data
     e.g. secondParam = { code: '123' };
    */
    const secondParam = undefined;
    const thirdParam = undefined;
    /* the logger will handle the passed exception by iteration over all it's fields
     * you can provide additional data in the stack and context
     */
    this.logger.error(exception, secondParam, thirdParam);
    // something needs to be returned so the default ExceptionsHandler is not triggered
    if (process.env.NODE_ENV === 'production') {
      // return a new error with only the message and the id
      // that way we are not exposing any internal information
      return new GraphQLError(exception.message, {
        extensions: {
          errorId: exception.errorId,
        },
      });
    }
    // if not in PROD, return everything
    return exception;
  }
}
