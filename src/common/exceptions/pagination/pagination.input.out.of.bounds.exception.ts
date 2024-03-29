import { LogContext, AlkemioErrorStatus } from '@common/enums';
import { BaseException } from '../base.exception';

export class PaginationInputOutOfBoundException extends BaseException {
  constructor(error: string, context = LogContext.PAGINATION) {
    super(error, context, AlkemioErrorStatus.PAGINATION_INPUT_OUT_OF_BOUND);
  }
}
