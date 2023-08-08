import { AlkemioErrorStatus, LogContext } from '@common/enums';
import { BaseHttpException } from './base.http.exception';
import { HttpStatus } from '@nestjs/common';

export class NotFoundHttpException extends BaseHttpException {
  constructor(message: string, context: LogContext, code?: AlkemioErrorStatus) {
    super(
      message,
      HttpStatus.NOT_FOUND,
      context,
      code ?? AlkemioErrorStatus.NOT_FOUND
    );
  }
}
