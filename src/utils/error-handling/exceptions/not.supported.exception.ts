import { HttpStatus } from '@nestjs/common';
import { LogContext } from '../../logging/logging.contexts';
import { BaseException } from './base.exception';

export class NotSupportedException extends BaseException {
  constructor(error: string, context: LogContext) {
    super(error, context, HttpStatus.METHOD_NOT_ALLOWED.toLocaleString());
  }
}
