import { LogContext, AlkemioErrorStatus } from '@common/enums';
import { BaseException } from '../base.exception';

export class UserAlreadyRegisteredException extends BaseException {
  constructor(
    error: string,
    context = LogContext.COMMUNITY,
    code?: AlkemioErrorStatus
  ) {
    super(error, context, code ?? AlkemioErrorStatus.USER_ALREADY_REGISTERED);
  }
}
