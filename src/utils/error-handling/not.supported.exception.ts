import { HttpStatus } from '@nestjs/common';
import { BaseException } from './base.exception';

export class NotSupportedException extends BaseException {
  constructor(error: string, context: string) {
    super(error, context, HttpStatus.METHOD_NOT_ALLOWED.toLocaleString());
  }
}
