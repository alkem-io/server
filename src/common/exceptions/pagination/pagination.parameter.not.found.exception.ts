import { AlkemioErrorStatus, LogContext } from '@common/enums';
import { BaseException } from '../base.exception';

export class PaginationParameterNotFoundException extends BaseException {
  constructor(message: string, context = LogContext.PAGINATION) {
    super(message, context, AlkemioErrorStatus.PAGINATION_PARAM_NOT_FOUND);
  }
}
