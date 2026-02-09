import { LogContext } from '@common/enums';
import { randomUUID } from 'crypto';
import { ExceptionDetails } from '../exception.details';

export class BaseExceptionInternal extends Error {
  private readonly exceptionName = this.constructor.name;

  constructor(
    public readonly message: string,
    public readonly context: LogContext,
    public readonly details?: ExceptionDetails,
    public readonly errorId: string = randomUUID()
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}
