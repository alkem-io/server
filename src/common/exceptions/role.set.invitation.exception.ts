import { AlkemioErrorStatus, LogContext } from '@common/enums';
import { BaseException } from './base.exception';

export class RoleSetInvitationException extends BaseException {
  constructor(message: string, context: LogContext, code?: AlkemioErrorStatus) {
    super(message, context, code ?? AlkemioErrorStatus.ROLE_SET_INVITATION);
  }
}
