import { UserInputError } from 'apollo-server-express';
import { LogContext } from '../logging/logging.contexts';

export class ValidationException extends UserInputError {
  private context: LogContext;
  constructor(error: string, context: LogContext) {
    super(error);
    this.context = context;
  }

  getContext(): string {
    return this.context;
  }
}
