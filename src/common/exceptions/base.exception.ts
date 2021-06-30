import { ApolloError } from 'apollo-server-express';
import { LogContext, AlkemioErrorStatus } from '@common/enums';

export class BaseException extends ApolloError {
  private context: LogContext;
  constructor(error: string, context: LogContext, code?: AlkemioErrorStatus) {
    super(error, code?.toLocaleString());
    this.context = context;
  }

  getContext(): LogContext {
    return this.context;
  }
}
