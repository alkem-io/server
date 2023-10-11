import { GraphQLError } from 'graphql';
import { LogContext, AlkemioErrorStatus } from '@common/enums';

export class BaseException extends GraphQLError {
  constructor(
    public error: string,
    public context: LogContext,
    public code: AlkemioErrorStatus
  ) {
    super(error, {
      extensions: { code: code.toLocaleString() },
    });
    this.name = this.constructor.name;
  }
}
