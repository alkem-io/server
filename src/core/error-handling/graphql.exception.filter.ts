import { BaseException } from '@common/exceptions/base.exception';
import { ArgumentsHost, Catch, Inject, LoggerService } from '@nestjs/common';
import { GqlExceptionFilter } from '@nestjs/graphql';
import { GraphQLError } from 'graphql';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

@Catch(GraphQLError)
export class GraphqlExceptionFilter implements GqlExceptionFilter {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  catch(exception: BaseException, host: ArgumentsHost) {
    const httpArguments = host.switchToHttp();
    const ctx = httpArguments.getNext<IGraphQLContext>();
    const userID =
      exception.details?.userId ?? ctx?.req?.user?.actorID ?? 'unknown';
    exception.details = {
      ...exception.details,
      userId: userID,
    };
    const loggableException = {
      ...exception,
      stack: String(exception.stack),
      extensions: undefined, // we do not need it
    };
    this.logger.error(loggableException);
    // something needs to be returned so the default ExceptionsHandler is not triggered
    if (process.env.NODE_ENV === 'production') {
      // return a new error with only the message and the id
      // that way we are not exposing any internal information
      return new GraphQLError(exception.message, {
        extensions: {
          errorId: exception.errorId,
          code: exception.code,
        },
      });
    }
    // if not in PROD, return everything
    return exception;
  }
}
