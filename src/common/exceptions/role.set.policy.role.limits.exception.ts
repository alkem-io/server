import { AlkemioErrorStatus, LogContext } from '@common/enums';
import { BaseException } from './base.exception';

export class RoleSetPolicyRoleLimitsException extends BaseException {
  constructor(message: string, context: LogContext, code?: AlkemioErrorStatus) {
    super(
      message,
      context,
      code ?? AlkemioErrorStatus.ROLE_SET_POLICY_ROLE_LIMITS_VIOLATED
    );
  }
}
