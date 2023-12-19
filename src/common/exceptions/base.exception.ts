import { GraphQLError } from 'graphql';
import { LogContext, AlkemioErrorStatus } from '@common/enums';
import { ExceptionDetails } from './exception.details';

export class BaseException extends GraphQLError {
  private readonly exceptionName = this.constructor.name;
  constructor(
    public error: string,
    public context: LogContext,
    public code: AlkemioErrorStatus,
    public details?: ExceptionDetails
  ) {
    super(error, {
      extensions: {
        code: code.toLocaleString(),
        details,
      },
    });
    this.name = this.constructor.name;
  }
}
