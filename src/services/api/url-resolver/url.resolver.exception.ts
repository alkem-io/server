import { AlkemioErrorStatus, LogContext } from '@common/enums';
import { BaseException } from '@common/exceptions/base.exception';
import { ExceptionDetails } from '@common/exceptions/exception.details';

export class UrlResolverException extends BaseException {
  constructor(error: string, context: LogContext, details?: ExceptionDetails) {
    super(error, context, AlkemioErrorStatus.URL_RESOLVER_ERROR, details);
  }
}
