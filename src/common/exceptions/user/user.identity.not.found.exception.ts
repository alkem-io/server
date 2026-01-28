import { AlkemioErrorStatus, LogContext } from '@common/enums';
import { BaseException } from '../base.exception';

export class UserIdentityNotFoundException extends BaseException {
  constructor(
    message: string,
    context = LogContext.COMMUNITY,
    code?: AlkemioErrorStatus
  ) {
    super(message, context, code ?? AlkemioErrorStatus.USER_IDENTITY_NOT_FOUND);
  }
}
