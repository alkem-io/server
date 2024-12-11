import { AlkemioErrorStatus, LogContext } from '@common/enums';
import { BaseException } from './base.exception';
import { ExceptionDetails } from '@common/exceptions/exception.details';

export class ForbiddenException extends BaseException {
  constructor(error: string, context: LogContext, details?: ExceptionDetails) {
    super(error, context, AlkemioErrorStatus.FORBIDDEN, details);
  }
}
