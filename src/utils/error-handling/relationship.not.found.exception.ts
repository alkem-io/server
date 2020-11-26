import { HttpStatus } from '@nestjs/common';
import { BaseException } from './base.exception';

export class RelationshipNotFoundException extends BaseException {
  constructor(error: string, context: string) {
    super(error, context, HttpStatus.FAILED_DEPENDENCY.toLocaleString());
  }
}
