import { AlkemioErrorStatus, LogContext } from '@common/enums';
import { HttpException, HttpStatus } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { getErrorCodeEntry } from '../error.code.registry';
import { ExceptionDetails } from '../exception.details';

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
