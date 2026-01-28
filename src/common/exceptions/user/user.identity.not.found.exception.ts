import { AlkemioErrorStatus, LogContext } from '@common/enums';
import { BaseException } from '../base.exception';

export class UserIdentityNotFoundException extends BaseException {
  constructor(
    error: string,
    context = LogContext.COMMUNITY,
    code?: AlkemioErrorStatus
  ) {
    super(error, context, code ?? AlkemioErrorStatus.USER_IDENTITY_NOT_FOUND);
  }
}
