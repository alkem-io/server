import { LogContext, AlkemioErrorStatus } from '@common/enums';
import { BaseException } from './base.exception';

export class CommunicationSessionUndefinedException extends BaseException {
  constructor(error: string, context: LogContext, code?: AlkemioErrorStatus) {
    super(error, context, code ?? AlkemioErrorStatus.SESSION_UNDEFINED);
  }
}
