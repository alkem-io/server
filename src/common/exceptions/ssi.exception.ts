import { LogContext, AlkemioErrorStatus } from '@common/enums';
import { BaseException } from './base.exception';

export class SsiException extends BaseException {
  constructor(error: string, code?: AlkemioErrorStatus) {
    super(error, LogContext.AUTH_TOKEN, code ?? AlkemioErrorStatus.SSI_ERROR);
  }
}
