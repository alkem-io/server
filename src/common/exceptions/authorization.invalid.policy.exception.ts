import { LogContext, AlkemioErrorStatus } from '@common/enums';
import { BaseException } from './base.exception';

export class AuthorizationInvalidPolicyException extends BaseException {
  constructor(error: string, context: LogContext) {
    super(error, context, AlkemioErrorStatus.AUTHORIZATION_INVALID_POLICY);
  }
}
