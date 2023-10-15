import { HttpException, HttpStatus } from '@nestjs/common';
import { LogContext, AlkemioErrorStatus } from '@common/enums';

export class BaseHttpException extends HttpException {
  private readonly exceptionName = this.constructor.name;
  constructor(
    public message: string,
    public statusCode: HttpStatus,
    public context: LogContext,
    public code: AlkemioErrorStatus
  ) {
    super(message, statusCode);
    this.name = this.constructor.name;
  }
}
