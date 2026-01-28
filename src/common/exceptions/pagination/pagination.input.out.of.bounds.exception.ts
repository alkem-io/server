import { AlkemioErrorStatus, LogContext } from '@common/enums';
import { BaseException } from '../base.exception';

export class PaginationInputOutOfBoundException extends BaseException {
  constructor(message: string, context = LogContext.PAGINATION) {
    super(message, context, AlkemioErrorStatus.PAGINATION_INPUT_OUT_OF_BOUND);
  }
}
