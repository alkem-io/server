import { AlkemioErrorStatus, LogContext } from '@common/enums';
import { BaseException } from './base.exception';

export class AuthorizationInvalidPolicyException extends BaseException {
  constructor(message: string, context: LogContext) {
    super(message, context, AlkemioErrorStatus.AUTHORIZATION_INVALID_POLICY);
  }
}
