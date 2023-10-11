import {
  AlkemioErrorStatus,
  AuthorizationPrivilege,
  LogContext,
} from '@common/enums';
import { BaseException } from './base.exception';

export class ForbiddenAuthorizationPolicyException extends BaseException {
  constructor(
    error: string,
    public checkedPrivilege: AuthorizationPrivilege,
    public authPolicyId: string,
    public userId: string
  ) {
    super(error, LogContext.AUTH, AlkemioErrorStatus.FORBIDDEN);
  }
}
