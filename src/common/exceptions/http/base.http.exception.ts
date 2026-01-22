import { HttpException, HttpStatus } from '@nestjs/common';
import { LogContext, AlkemioErrorStatus } from '@common/enums';
import { ExceptionDetails } from '../exception.details';
import { getErrorCodeEntry } from '../error.code.registry';
import { randomUUID } from 'crypto';

export class BaseHttpException extends HttpException {
  private readonly exceptionName = this.constructor.name;
  public readonly numericCode: number;
  public readonly userMessage: string;

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
    const entry =
      getErrorCodeEntry(code) ??
      getErrorCodeEntry(AlkemioErrorStatus.UNSPECIFIED)!;
    this.numericCode = entry.numericCode;
    this.userMessage = entry.userMessage;
  }
}
