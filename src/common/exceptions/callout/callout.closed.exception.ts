import { LogContext } from '@common/enums';
import { AlkemioErrorStatus } from '../../enums/alkemio.error.status';
import { BaseException } from '../base.exception';
import { ExceptionDetails } from '../exception.details';

export class CalloutClosedException extends BaseException {
  constructor(
    message: string,
    context = LogContext.COLLABORATION,
    details?: ExceptionDetails
  ) {
    super(message, context, AlkemioErrorStatus.CALLOUT_CLOSED, details);
  }
}
