import { LogContext } from '@common/enums';
import { AlkemioErrorStatus } from '@common/enums/alkemio.error.status';
import { BaseException } from './base.exception';

export class MatrixEntityNotFoundException extends BaseException {
  constructor(error: string, context: LogContext, code?: AlkemioErrorStatus) {
    super(
      error,
      context,
      code ?? AlkemioErrorStatus.MATRIX_ENTITY_NOT_FOUND_ERROR
    );
  }
}
