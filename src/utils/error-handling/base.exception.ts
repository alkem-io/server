import { ApolloError } from 'apollo-server-express';
import { LogContext } from '../logging/logging.contexts';

export class BaseException extends ApolloError {
  private context: LogContext;
  constructor(error: string, context: LogContext, code?: string) {
    super(error, code);
    this.context = context;
  }

  getContext(): LogContext {
    return this.context;
  }
}
