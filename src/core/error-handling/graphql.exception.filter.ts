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
    const a = host.switchToHttp();
    const ctx = a.getNext<IGraphQLContext>();
    exception.details = {
      ...exception.details,
      userId: ctx.req.user.userID,
    };
    /* add values in 'stack' that you want to include as additional data
      e.g. stack = { code: '123' };
      THE VAR NAME DOES NOT CORRESPOND WITH ITS VALUE OR PURPOSE
     */
    const stack = undefined;
    const context = undefined;

    /* the logger will handle the passed exception by iteration over all it's fields
     * you can provide additional data in the stack and context
     */
    this.logger.error(exception, stack, context);
    // something needs to be returned so the default ExceptionsHandler is not triggered
    return exception;
  }
}
