/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/ban-types */

import { OpportunityInput } from '@domain/challenge/opportunity/opportunity.dto';
import { ValidationException } from '@src/common/error-handling/exceptions';
import { LogContext } from '@src/core/logging/logging.contexts';
import { validate, ValidationError } from 'class-validator';
import { AbstractHandler } from './base/abstract.handler';

export class OpportunityHandler extends AbstractHandler {
  public async handle(
    value: any,
    metatype: Function
  ): Promise<ValidationError[]> {
    if (metatype === OpportunityInput) {
      const errors = await validate(value);
      if (errors.length > 0) {
        throw new ValidationException('DTO validation failed', LogContext.API);
      }
    }
    return super.handle(value, metatype);
  }
}
