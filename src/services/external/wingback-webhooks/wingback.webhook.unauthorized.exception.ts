import { AlkemioErrorStatus, LogContext } from '@common/enums';
import { ExceptionDetails } from '@common/exceptions/exception.details';
import { BaseHttpException } from '@common/exceptions/http';
import { HttpStatus } from '@nestjs/common';

export class WingbackWebhookUnauthorizedException extends BaseHttpException {
  constructor(context: LogContext, details?: ExceptionDetails) {
    super(
      'Unauthorized',
      HttpStatus.UNAUTHORIZED,
      context,
      AlkemioErrorStatus.UNAUTHORIZED,
      details
    );
  }
}
