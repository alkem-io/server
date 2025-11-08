import { LogContext, AlkemioErrorStatus } from '@common/enums';
import { BaseHttpException } from './base.http.exception';
import { HttpStatus } from '@nestjs/common';
import { ExceptionDetails } from '@common/exceptions/exception.details';

export class ServiceUnavailableHttpException extends BaseHttpException {
  constructor(
    message: string,
    context: LogContext,
    code: AlkemioErrorStatus | string = AlkemioErrorStatus.UNSPECIFIED,
    details?: ExceptionDetails,
    errorId?: string
  ) {
    super(
      message,
      HttpStatus.SERVICE_UNAVAILABLE,
      context,
      code,
      details,
      errorId
    );
  }
}
