import { AlkemioErrorStatus, LogContext } from '@common/enums';
import { BaseException } from './base.exception';

export class InvalidTemplateTypeException extends BaseException {
  constructor(message: string, context: LogContext) {
    super(message, context, AlkemioErrorStatus.INVALID_TEMPLATE_TYPE);
  }
}
