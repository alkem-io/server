import { HttpStatus } from '@nestjs/common';
import { BaseException } from './base.exception';

export class EntityNotInitializedException extends BaseException {
  constructor(error: string, context: string) {
    super(error, context, HttpStatus.UNPROCESSABLE_ENTITY.toLocaleString());
  }
}
