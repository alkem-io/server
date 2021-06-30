import { LogContext, AlkemioErrorStatus } from '@common/enums';
import { BaseException } from './base.exception';

export class TokenException extends BaseException {
  constructor(error: string, code?: AlkemioErrorStatus) {
    super(
      error,
      LogContext.AUTH_TOKEN,
      code ?? AlkemioErrorStatus.INVALID_TOKEN
    );
  }
}
