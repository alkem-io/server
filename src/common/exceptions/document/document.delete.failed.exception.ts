import { AlkemioErrorStatus, LogContext } from '@common/enums';
import { BaseException } from '../base.exception';
import { ExceptionDetails } from '../exception.details';

export class DocumentDeleteFailedException extends BaseException {
  constructor(
    message: string,
    context: LogContext,
    details?: ExceptionDetails
  ) {
    super(message, context, AlkemioErrorStatus.DOCUMENT_DELETE_FAILED, details);
  }
}
