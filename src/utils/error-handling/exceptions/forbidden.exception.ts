import { ForbiddenError } from 'apollo-server-express';
import { LogContext } from '@utils/logging/logging.contexts';

export class ForbiddenException extends ForbiddenError {
  private context: LogContext;

  constructor(error: string, context: LogContext) {
    super(error);
    this.context = context;
  }

  getContext(): LogContext {
    return this.context;
  }
}
