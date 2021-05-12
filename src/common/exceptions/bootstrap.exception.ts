import { CherrytwistErrorStatus, LogContext } from '@common/enums';
import { BaseException } from './base.exception';

export class BootstrapException extends BaseException {
  constructor(error: string) {
    super(error, LogContext.BOOTSTRAP, CherrytwistErrorStatus.BOOTSTRAP_FAILED);
  }
}
