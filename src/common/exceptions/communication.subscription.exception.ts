import { LogContext, AlkemioErrorStatus } from '@common/enums';
import { BaseException } from './base.exception';

export class CommunicationSubscriptionException extends BaseException {
  constructor(error: string, context: LogContext, code?: AlkemioErrorStatus) {
    super(
      error,
      context,
      code ?? AlkemioErrorStatus.COMMUNICATION_SUBSCRIPTION_ERROR
    );
  }
}
