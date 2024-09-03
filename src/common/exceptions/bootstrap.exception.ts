import { AlkemioErrorStatus, LogContext } from '@common/enums';
import { BaseException } from './base.exception';
import { ExceptionDetails } from '@common/exceptions/exception.details';

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
