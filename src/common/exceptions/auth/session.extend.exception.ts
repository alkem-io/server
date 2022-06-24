import { LogContext, AlkemioErrorStatus } from '@common/enums';
import { BaseException } from '../base.exception';

export class SessionExtendException extends BaseException {
  constructor(
    error: string,
    context = LogContext.AUTH,
    code?: AlkemioErrorStatus
  ) {
    super(error, context, code ?? AlkemioErrorStatus.SESSION_EXTEND);
  }
}
