import { AlkemioErrorStatus, LogContext } from '@common/enums';
import { BaseException } from './base.exception';

export class SubscriptionUserNotAuthenticated extends BaseException {
  constructor(message: string, context: LogContext) {
    super(
      message,
      context,
      AlkemioErrorStatus.SUBSCRIPTION_USER_NOT_AUTHENTICATED
    );
  }
}
