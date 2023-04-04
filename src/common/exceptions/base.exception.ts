import { GraphQLError } from 'graphql';
import { LogContext, AlkemioErrorStatus } from '@common/enums';

export class BaseException extends GraphQLError {
  private context: LogContext;
  constructor(error: string, context: LogContext, code?: AlkemioErrorStatus) {
    super(error, {
      extensions: { code: code?.toLocaleString() },
    });
    this.context = context;
  }

  getContext(): LogContext {
    return this.context;
  }
}
