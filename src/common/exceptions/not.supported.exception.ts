import { LogContext, CherrytwistErrorStatus } from '@common/enums';
import { BaseException } from './base.exception';

export class NotSupportedException extends BaseException {
  constructor(error: string, context: LogContext) {
    super(error, context, CherrytwistErrorStatus.NOT_SUPPORTED);
  }
}
