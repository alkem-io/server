import { LogContext, AlkemioErrorStatus } from '@common/enums';
import { BaseException } from '../base.exception';

export class UserNotVerifiedException extends BaseException {
  constructor(error: string, context: LogContext, code?: AlkemioErrorStatus) {
    super(error, context, code ?? AlkemioErrorStatus.USER_NOT_VERIFIED);
  }
}
