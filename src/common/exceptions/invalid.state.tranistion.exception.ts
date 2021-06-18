import { LogContext, CherrytwistErrorStatus } from '@common/enums';
import { BaseException } from './base.exception';

export class InvalidStateTransitionException extends BaseException {
  constructor(error: string, context: LogContext) {
    super(error, context, CherrytwistErrorStatus.INVALID_STATE_TRANSITION);
  }
}
