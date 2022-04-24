import { LogContext, AlkemioErrorStatus } from '@common/enums';
import { BaseException } from './base.exception';

export class SubscriptionUserNotAuthenticated extends BaseException {
  constructor(error: string, context: LogContext) {
    super(
      error,
      context,
      AlkemioErrorStatus.SUBSCRIPTION_USER_NOT_AUTHENTICATED
    );
  }
}
