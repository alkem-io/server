import { LogContext, AlkemioErrorStatus } from '@common/enums';
import { BaseException } from '../base.exception';

export class DuplicateAuthIdException extends BaseException {
  constructor(authId: string, context = LogContext.COMMUNITY) {
    super(
      `authId ${authId} already linked to another user`,
      context,
      AlkemioErrorStatus.USER_IDENTITY_DUPLICATE
    );
  }
}
