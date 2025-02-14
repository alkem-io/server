import { AlkemioErrorStatus, LogContext } from '@common/enums';
import { BaseException } from '../../exceptions/base.exception';
import { ExceptionDetails } from '../../exceptions/exception.details';

export class StorageDisabledException extends BaseException {
  constructor(error: string, context: LogContext, details?: ExceptionDetails) {
    super(error, context, AlkemioErrorStatus.STORAGE_DISABLED, details);
  }
}
