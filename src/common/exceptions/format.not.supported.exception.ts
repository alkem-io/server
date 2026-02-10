import { AlkemioErrorStatus, LogContext } from '@common/enums';
import { BaseException } from './base.exception';

export class FormatNotSupportedException extends BaseException {
  constructor(message: string, context: LogContext, code?: AlkemioErrorStatus) {
    super(message, context, code ?? AlkemioErrorStatus.FORMAT_NOT_SUPPORTED);
  }
}
