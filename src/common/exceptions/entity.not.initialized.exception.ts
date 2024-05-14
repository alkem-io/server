import { LogContext, AlkemioErrorStatus } from '@common/enums';
import { BaseException } from './base.exception';
import { ExceptionDetails } from '@common/exceptions/exception.details';

export class EntityNotInitializedException extends BaseException {
  constructor(error: string, context: LogContext, details?: ExceptionDetails) {
    super(error, context, AlkemioErrorStatus.ENTITY_NOT_INITIALIZED, details);
  }
}
