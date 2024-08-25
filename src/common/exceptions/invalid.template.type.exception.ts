import { LogContext, AlkemioErrorStatus } from '@common/enums';
import { BaseException } from './base.exception';

export class InvalidTemplateTypeException extends BaseException {
  constructor(error: string, context: LogContext) {
    super(error, context, AlkemioErrorStatus.INVALID_TEMPLATE_TYPE_TRANSITION);
  }
}
