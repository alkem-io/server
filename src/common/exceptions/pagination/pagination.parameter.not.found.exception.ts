import { LogContext, AlkemioErrorStatus } from '@common/enums';
import { BaseException } from '../base.exception';

export class PaginationParameterNotFoundException extends BaseException {
  constructor(error: string, context = LogContext.PAGINATION) {
    super(error, context, AlkemioErrorStatus.PAGINATION_PARAM_NOT_FOUND);
  }
}
