import { LogContext } from '@common/enums';
import { AlkemioErrorStatus } from '@common/enums';
import { BaseException } from '../base.exception';

export class CalloutClosedException extends BaseException {
  constructor(error: string, context = LogContext.COLLABORATION) {
    super(error, context, AlkemioErrorStatus.CALLOUT_CLOSED);
  }
}
