import { AlkemioErrorStatus, LogContext } from '@common/enums';
import { BaseException } from '../base.exception';
import { ExceptionDetails } from '../exception.details';

export class UserAlreadyRegisteredException extends BaseException {
  constructor(
    error: string,
    context = LogContext.COMMUNITY,
    details?: ExceptionDetails
  ) {
    super(error, context, AlkemioErrorStatus.USER_ALREADY_REGISTERED, details);
  }
}
