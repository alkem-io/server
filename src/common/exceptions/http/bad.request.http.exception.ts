import { AlkemioErrorStatus, LogContext } from '@common/enums';
import { BaseHttpException } from './base.http.exception';
import { HttpStatus } from '@nestjs/common';
import { ExceptionDetails } from '@common/exceptions/exception.details';

export class BadRequestHttpException extends BaseHttpException {
  constructor(
    message: string,
    context: LogContext,
    details?: ExceptionDetails
  ) {
    super(
      message,
      HttpStatus.BAD_REQUEST,
      context,
      AlkemioErrorStatus.BAD_USER_INPUT,
      details
    );
  }
}
