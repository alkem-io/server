import { BaseException } from '@common/exceptions/base.exception';
import { AlkemioErrorStatus, LogContext } from '@common/enums';

export class GeoServiceLimitReachedException extends BaseException {
  constructor(error: string, context: LogContext) {
    super(error, context, AlkemioErrorStatus.GEO_SERVICE_LIMIT_REACHED);
  }
}
