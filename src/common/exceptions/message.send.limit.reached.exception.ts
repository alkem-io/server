import { AlkemioErrorStatus, LogContext } from '@common/enums';
import { BaseException } from './base.exception';

/**
 * A member has used their hourly allowance for sending messages to people.
 * The details name the sender and which send action was used, nothing more.
 */
export class MessageSendLimitReachedException extends BaseException {
  constructor(details: { userId: string; action: string }) {
    super(
      'You can send up to 20 messages an hour.',
      LogContext.COMMUNICATION,
      AlkemioErrorStatus.MESSAGE_SEND_LIMIT_REACHED,
      details
    );
  }
}
