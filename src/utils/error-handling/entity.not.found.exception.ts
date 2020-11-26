import { HttpStatus } from '@nestjs/common';
import { BaseException } from './base.exception';

export class EntityNotFoundException extends BaseException {
  constructor(error: string, context: string) {
    super(error, context, HttpStatus.BAD_REQUEST.toLocaleString());
  }
}
