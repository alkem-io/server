import { LogContext } from '@common/enums';
import { AlkemioErrorStatus } from '../../enums/alkemio.error.status';
import { BaseException } from '../base.exception';

export class CalloutClosedException extends BaseException {
  constructor(message: string, context = LogContext.COLLABORATION) {
    super(message, context, AlkemioErrorStatus.CALLOUT_CLOSED);
  }
}
