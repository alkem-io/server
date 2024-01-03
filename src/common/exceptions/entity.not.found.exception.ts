import { LogContext, AlkemioErrorStatus } from '@common/enums';
import { BaseException } from './base.exception';
import { ExceptionDetails } from './exception.details';

export class EntityNotFoundException extends BaseException {
  constructor(error: string, context: LogContext, details?: ExceptionDetails) {
    super(error, context, AlkemioErrorStatus.ENTITY_NOT_FOUND, details);
  }
}
