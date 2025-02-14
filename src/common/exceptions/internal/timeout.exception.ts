import { BaseExceptionInternal } from '@common/exceptions/internal/base.exception.internal';
import { ExceptionDetails } from '@common/exceptions/exception.details';
import { LogContext } from '@common/enums';

export class TimeoutException extends BaseExceptionInternal {
  constructor(error: string, context: LogContext, details?: ExceptionDetails) {
    super(error, context, details);
  }
}
