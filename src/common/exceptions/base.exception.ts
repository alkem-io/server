import { GraphQLError } from 'graphql';
import { randomUUID } from 'crypto';
import { LogContext, AlkemioErrorStatus } from '@common/enums';
import { ExceptionDetails } from './exception.details';

export class BaseException extends GraphQLError {
  private readonly exceptionName = this.constructor.name;
  constructor(
    public message: string,
    public context: LogContext,
    public code: AlkemioErrorStatus,
    public details?: ExceptionDetails,
    public errorId: string = randomUUID()
  ) {
    super(message, {
      extensions: {
        code: code.toLocaleString(),
        context,
        errorId,
        details,
      },
    });
    this.name = this.constructor.name;
  }
}
