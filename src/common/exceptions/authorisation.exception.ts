import { CherrytwistErrorStatus, LogContext } from '@common/enums';
import { BaseException } from './base.exception';

export class AuthorizationException extends BaseException {
  constructor(error: string, context: LogContext) {
    super(
      error,
      context,
      CherrytwistErrorStatus.AUTHORIZATION_UPDATE_NOT_ALLOWED
    );
  }
}
