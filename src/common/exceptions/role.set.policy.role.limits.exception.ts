import { LogContext, AlkemioErrorStatus } from '@common/enums';
import { BaseException } from './base.exception';

export class RoleSetPolicyRoleLimitsException extends BaseException {
  constructor(error: string, context: LogContext, code?: AlkemioErrorStatus) {
    super(
      error,
      context,
      code ?? AlkemioErrorStatus.ROLE_SET_POLICY_ROLE_LIMITS_VIOLATED
    );
  }
}
