import { BaseException } from '@common/exceptions/base.exception';
import { AlkemioErrorStatus, LogContext } from '@common/enums';

export class GeoServiceRequestLimitExceededException extends BaseException {
  constructor(error: string, context: LogContext) {
    super(
      error,
      context,
      AlkemioErrorStatus.GEO_SERVICE_REQUEST_LIMIT_EXCEEDED
    );
  }
}
