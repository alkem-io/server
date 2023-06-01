import { LogContext, AlkemioErrorStatus } from '@common/enums';
import { BaseException } from './base.exception';

export class OperationNotAllowedException extends BaseException {
  constructor(error: string, context: LogContext) {
    super(error, context, AlkemioErrorStatus.OPERATION_NOT_ALLOWED);
  }
}
