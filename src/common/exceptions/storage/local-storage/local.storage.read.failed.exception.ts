import { AlkemioErrorStatus, LogContext } from '@common/enums';
import { BaseException } from '../../base.exception';
import { ExceptionDetails } from '../../exception.details';

export class LocalStorageReadFailedException extends BaseException {
  constructor(
    message: string,
    context: LogContext,
    details?: ExceptionDetails
  ) {
    super(
      message,
      context,
      AlkemioErrorStatus.LOCAL_STORAGE_READ_FAILED,
      details
    );
  }
}
