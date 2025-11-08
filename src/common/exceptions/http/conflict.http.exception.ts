import { LogContext, AlkemioErrorStatus } from '@common/enums';
import { BaseHttpException } from './base.http.exception';
import { HttpStatus } from '@nestjs/common';
import { ExceptionDetails } from '@common/exceptions/exception.details';

export class ConflictHttpException extends BaseHttpException {
  constructor(
    message: string,
    context: LogContext,
    code: AlkemioErrorStatus | string = AlkemioErrorStatus.UNSPECIFIED,
    details?: ExceptionDetails,
    errorId?: string
  ) {
    super(message, HttpStatus.CONFLICT, context, code, details, errorId);
  }
}
