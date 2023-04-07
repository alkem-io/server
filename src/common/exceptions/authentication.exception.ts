import { LogContext } from '@common/enums';
import { AuthenticationError } from './authentication.error';

export class AuthenticationException extends AuthenticationError {
  private context: LogContext;

  constructor(error: string) {
    super(error);
    this.context = LogContext.AUTH;
  }

  getContext(): LogContext {
    return this.context;
  }
}
