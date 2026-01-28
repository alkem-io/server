import { AlkemioErrorStatus, LogContext } from '@common/enums';
import { ExceptionDetails } from '@common/exceptions/exception.details';
import { BaseException } from './base.exception';

export class EntityNotInitializedException extends BaseException {
  constructor(
    message: string,
    context: LogContext,
    details?: ExceptionDetails
  ) {
    super(message, context, AlkemioErrorStatus.ENTITY_NOT_INITIALIZED, details);
  }
}
