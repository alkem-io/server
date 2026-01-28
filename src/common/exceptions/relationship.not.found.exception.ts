import { AlkemioErrorStatus, LogContext } from '@common/enums';
import { BaseException } from './base.exception';
import { ExceptionDetails } from './exception.details';

export class RelationshipNotFoundException extends BaseException {
  constructor(
    message: string,
    context: LogContext,
    details?: ExceptionDetails
  ) {
    super(message, context, AlkemioErrorStatus.RELATION_NOT_LOADED, details);
  }
}
