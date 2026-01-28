import { LogContext } from '@common/enums';
import { ExceptionDetails } from '@common/exceptions/exception.details';
import { BaseExceptionInternal } from '@common/exceptions/internal/base.exception.internal';
import { WingbackError } from '@services/external/wingback/types/wingback.type.error';

export class WingbackException extends BaseExceptionInternal {
  constructor(
    public readonly error: string,
    public readonly context: LogContext,
    public readonly status?: number,
    public readonly statusText?: string,
    public readonly details?: ExceptionDetails & {
      url: string;
      method: string;
      data?: WingbackError;
    }
  ) {
    super(error, context, details);
  }
}

export const isWingbackException = (
  error: unknown
): error is WingbackException => error instanceof WingbackException;
