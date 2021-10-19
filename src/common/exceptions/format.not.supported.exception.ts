import { LogContext, AlkemioErrorStatus } from '@common/enums';
import { BaseException } from './base.exception';

export class FormatNotSupportedException extends BaseException {
  constructor(error: string, context: LogContext, code?: AlkemioErrorStatus) {
    super(error, context, code ?? AlkemioErrorStatus.FORMAT_NOT_SUPPORTED);
  }
}
