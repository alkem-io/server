import { AuthenticationError } from 'apollo-server-express';
import { LogContext } from '../../logging/logging.contexts';

export class TokenException extends AuthenticationError {
  private context: LogContext;

  constructor(error: string) {
    super(error);
    this.context = LogContext.AUTH_TOKEN;
  }

  getContext(): LogContext {
    return this.context;
  }
}
