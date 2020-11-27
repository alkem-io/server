import { HttpStatus } from '@nestjs/common';
import { LogContext } from '../logging/logging.contexts';
import { BaseException } from './base.exception';

export class RelationshipNotFoundException extends BaseException {
  constructor(error: string, context: LogContext) {
    super(error, context, HttpStatus.FAILED_DEPENDENCY.toLocaleString());
  }
}
