import { HttpException, HttpStatus } from '@nestjs/common';
import { LogContext, AlkemioErrorStatus } from '@common/enums';
import { ExceptionDetails } from '../exception.details';
import { randomUUID } from 'crypto';

export class BaseHttpException extends HttpException {
  private readonly exceptionName = this.constructor.name;
  constructor(
    public message: string,
    public statusCode: HttpStatus,
    public context: LogContext,
    public code: AlkemioErrorStatus,
    public details?: ExceptionDetails,
    public errorId: string = randomUUID()
  ) {
    super(message, statusCode);
    this.name = this.constructor.name;
  }
}
