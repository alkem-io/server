import { AlkemioErrorStatus, LogContext } from '@common/enums';
import { BaseException } from './base.exception';
import { ExceptionDetails } from './exception.details';

export class RoleSetMembershipException extends BaseException {
  constructor(
    message: string,
    context: LogContext,
    code?: AlkemioErrorStatus,
    details?: ExceptionDetails
  ) {
    super(message, context, code ?? AlkemioErrorStatus.ROLE_SET_ROLE, details);
  }
}
