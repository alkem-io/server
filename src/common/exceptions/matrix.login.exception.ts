import { LogContext, CherrytwistErrorStatus } from '@common/enums';
import { BaseException } from './base.exception';

export class MatrixUserLoginException extends BaseException {
  constructor(
    error: string,
    context: LogContext,
    code?: CherrytwistErrorStatus
  ) {
    super(error, context, code ?? CherrytwistErrorStatus.MATRIX_LOGIN_FAILED);
  }
}
