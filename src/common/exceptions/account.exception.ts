import { AlkemioErrorStatus, LogContext } from '@common/enums';
import { BaseException } from './base.exception';

export class AccountException extends BaseException {
  constructor(message: string, context: LogContext, code?: AlkemioErrorStatus) {
    super(message, context, code ?? AlkemioErrorStatus.ACCOUNT_NOT_FOUND);
  }
}
