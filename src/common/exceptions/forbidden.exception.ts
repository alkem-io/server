import { LogContext } from '@common/enums';
import { ForbiddenError } from './forbidden.error';

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
