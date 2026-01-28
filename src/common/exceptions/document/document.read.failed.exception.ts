import { AlkemioErrorStatus, LogContext } from '@common/enums';
import { BaseException } from '../base.exception';
import { ExceptionDetails } from '../exception.details';

export class DocumentReadFailedException extends BaseException {
  constructor(
    message: string,
    context: LogContext,
    details?: ExceptionDetails
  ) {
    super(message, context, AlkemioErrorStatus.DOCUMENT_READ_FAILED, details);
  }
}
