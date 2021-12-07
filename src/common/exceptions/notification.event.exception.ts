import { LogContext, AlkemioErrorStatus } from '@common/enums';
import { BaseException } from './base.exception';

export class NotificationEventException extends BaseException {
  constructor(error: string, context: LogContext, code?: AlkemioErrorStatus) {
    super(
      error,
      context,
      code ?? AlkemioErrorStatus.NOTIFICATION_PAYLOAD_BUILDER_ERROR
    );
  }
}
