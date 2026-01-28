import { AlkemioErrorStatus, LogContext } from '@common/enums';
import { BaseException } from '../base.exception';
import { ExceptionDetails } from '../exception.details';

export class UserAlreadyRegisteredException extends BaseException {
  constructor(
    message: string,
    context = LogContext.COMMUNITY,
    details?: ExceptionDetails
  ) {
    super(
      message,
      context,
      AlkemioErrorStatus.USER_ALREADY_REGISTERED,
      details
    );
  }
}
