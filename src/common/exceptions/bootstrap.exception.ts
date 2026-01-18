import { AlkemioErrorStatus, LogContext } from '@common/enums';
import { ExceptionDetails } from '@common/exceptions/exception.details';
import { BaseException } from './base.exception';

export class BootstrapException extends BaseException {
  constructor(error: string, details?: ExceptionDetails) {
    super(
      error,
      LogContext.BOOTSTRAP,
      AlkemioErrorStatus.BOOTSTRAP_FAILED,
      details
    );
  }
}
