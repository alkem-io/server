import { HttpStatus } from '@nestjs/common';
import { BaseException } from './base.exception';

export class NotAcceptableException extends BaseException {
  constructor(error: string, context: string) {
    super(error, context, HttpStatus.NOT_ACCEPTABLE.toLocaleString());
  }
}
