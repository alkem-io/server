import { LogContext } from '@common/enums';
import { UserInputError } from './user.input.error';

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
