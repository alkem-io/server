import { LogContext, CherrytwistErrorStatus } from '@common/enums';
import { BaseException } from './base.exception';

export class AccountException extends BaseException {
  constructor(
    error: string,
    context: LogContext,
    code?: CherrytwistErrorStatus
  ) {
    super(error, context, code ?? CherrytwistErrorStatus.ACCOUNT_NOT_FOUND);
  }
}
