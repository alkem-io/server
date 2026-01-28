import { AlkemioErrorStatus, LogContext } from '@common/enums';
import { BaseException } from '../base.exception';

export class UserIdentityDeletionException extends BaseException {
  constructor(
    error: string,
    context = LogContext.AUTH,
    code?: AlkemioErrorStatus
  ) {
    super(
      error,
      context,
      code ?? AlkemioErrorStatus.USER_IDENTITY_DELETION_FAILED
    );
  }
}
