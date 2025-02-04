import { BaseExceptionInternal } from '@common/exceptions/internal/base.exception.internal';
import { LogContext } from '@common/enums';
import { ExceptionDetails } from '@common/exceptions/exception.details';

export class WingbackCustomerNotRemoved extends BaseExceptionInternal {
  constructor(
    public readonly error: string,
    public readonly context: LogContext,
    public readonly details?: ExceptionDetails
  ) {
    super(error, context, details);
  }
}
