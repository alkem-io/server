import { ApolloError } from 'apollo-server-express';
import { LogContext, CherrytwistErrorStatus } from '@common/enums';

export class BaseException extends ApolloError {
  private context: LogContext;
  constructor(
    error: string,
    context: LogContext,
    code?: CherrytwistErrorStatus
  ) {
    super(error, code?.toLocaleString());
    this.context = context;
  }

  getContext(): LogContext {
    return this.context;
  }
}
