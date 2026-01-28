import { AlkemioErrorStatus, LogContext } from '@common/enums';
import { BaseException } from '../base.exception';

export class PaginationNotFoundException extends BaseException {
  constructor(message: string, context: LogContext) {
    super(message, context, AlkemioErrorStatus.PAGINATION_NOT_FOUND);
  }
}
