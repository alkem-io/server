import { LogContext } from '@common/enums';
import { AlkemioErrorStatus } from '@common/enums/alkemio.error.status';
import { BaseException } from './base.exception';
import { ExceptionDetails } from './exception.details';

export class MatrixEntityNotFoundException extends BaseException {
  constructor(
    error: string,
    context: LogContext,
    code?: AlkemioErrorStatus,
    details?: ExceptionDetails
  ) {
    super(
      error,
      context,
      code ?? AlkemioErrorStatus.MATRIX_ENTITY_NOT_FOUND_ERROR,
      details
    );
  }
}
