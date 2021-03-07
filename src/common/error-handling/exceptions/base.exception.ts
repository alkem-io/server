import { ApolloError } from 'apollo-server-express';
import { LogContext } from '@src/core/logging/logging.contexts';
import { CherrytwistErrorStatus } from '../enums/cherrytwist.error.status';

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
