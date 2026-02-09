import { AlkemioErrorStatus, LogContext } from '@common/enums';
import { BaseException } from './base.exception';

export class InvalidStateTransitionException extends BaseException {
  constructor(message: string, context: LogContext) {
    super(message, context, AlkemioErrorStatus.INVALID_STATE_TRANSITION);
  }
}
