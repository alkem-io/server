import { GraphQLError } from 'graphql';
import { LogContext, AlkemioErrorStatus } from '@common/enums';

export class BaseException extends GraphQLError {
  private readonly exceptionName = this.constructor.name;
  constructor(
    public error: string,
    public context: LogContext,
    public code: AlkemioErrorStatus
  ) {
    super(error, {
      extensions: {
        code: code.toLocaleString(),
      },
    });
  }
}
