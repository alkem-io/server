import { AlkemioErrorStatus, LogContext } from '@common/enums';
import { ExceptionDetails } from '@common/exceptions/exception.details';
import { BaseException } from './base.exception';

export class BootstrapException extends BaseException {
  constructor(message: string, details?: ExceptionDetails) {
    super(
      message,
      LogContext.BOOTSTRAP,
      AlkemioErrorStatus.BOOTSTRAP_FAILED,
      details
    );
  }
}
