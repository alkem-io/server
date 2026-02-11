import { AlkemioErrorStatus, LogContext } from '@common/enums';
import { HttpException, HttpStatus } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  computeNumericCode,
  getMetadataForStatus,
} from '../error.status.metadata';
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

    const metadata = getMetadataForStatus(code);
    this.numericCode = computeNumericCode(metadata);
    this.userMessage = metadata.userMessage;
  }
}
