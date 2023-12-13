import { LogContext, AlkemioErrorStatus } from '@common/enums';
import { BaseException, ExceptionDetails } from './base.exception';

export class EntityNotFoundException extends BaseException {
  constructor(error: string, context: LogContext, details?: ExceptionDetails) {
    super(error, context, AlkemioErrorStatus.ENTITY_NOT_FOUND, details);
  }
}
