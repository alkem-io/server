import { LogContext } from '@common/enums';
import { BadRequestHttpException } from '@common/exceptions/http';
import { ValidationPipe } from '@nestjs/common';
import { ValidationError } from 'class-validator';

export const getContractValidationPipe = () => {
  const exceptionFactory = (errors: ValidationError[]) => {
    const details = errors.reduce(
      (acc, { property, constraints }) => {
        acc[property] = {
          ...acc[property],
          constraints: { ...acc[property]?.['constraints'], ...constraints },
        };
        return acc;
      },
      {} as Record<string, any>
    );
    return new BadRequestHttpException(
      'Invalid data provided in payload',
      LogContext.WINGBACK_HOOKS,
      details
    );
  };

  return new ValidationPipe({ exceptionFactory });
};
