import { LogContext, AlkemioErrorStatus } from '@common/enums';
import { BaseException } from '../base.exception';

export class BearerTokenNotFoundException extends BaseException {
  constructor(
    error: string,
    context = LogContext.AUTH,
    code?: AlkemioErrorStatus
  ) {
    super(error, context, code ?? AlkemioErrorStatus.BEARER_TOKEN);
  }
}
