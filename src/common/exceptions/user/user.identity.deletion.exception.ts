import { AlkemioErrorStatus, LogContext } from '@common/enums';
import { BaseException } from '../base.exception';

export class UserIdentityDeletionException extends BaseException {
  constructor(
    message: string,
    context = LogContext.AUTH,
    code?: AlkemioErrorStatus
  ) {
    super(
      message,
      context,
      code ?? AlkemioErrorStatus.USER_IDENTITY_DELETION_FAILED
    );
  }
}
