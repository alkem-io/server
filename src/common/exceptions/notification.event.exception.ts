import { AlkemioErrorStatus, LogContext } from '@common/enums';
import { BaseException } from './base.exception';

export class NotificationEventException extends BaseException {
  constructor(message: string, context: LogContext, code?: AlkemioErrorStatus) {
    super(
      message,
      context,
      code ?? AlkemioErrorStatus.NOTIFICATION_PAYLOAD_BUILDER_ERROR
    );
  }
}
