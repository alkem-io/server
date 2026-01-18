import { LogContext } from '@common/enums';
import { ExceptionDetails } from '@common/exceptions/exception.details';
import { BaseExceptionInternal } from '@common/exceptions/internal/base.exception.internal';

export class TimeoutException extends BaseExceptionInternal {
  constructor(error: string, context: LogContext, details?: ExceptionDetails) {
    super(error, context, details);
  }
}
