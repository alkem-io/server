import { AlkemioErrorStatus, LogContext } from '@common/enums';
import { ExceptionDetails } from '@common/exceptions/exception.details';
import { BaseHttpException } from '@common/exceptions/http';
import { HttpStatus } from '@nestjs/common';

export class GeoServiceNotAvailableException extends BaseHttpException {
  constructor(
    message: string,
    context: LogContext,
    details?: ExceptionDetails
  ) {
    super(
      message,
      HttpStatus.SERVICE_UNAVAILABLE,
      context,
      AlkemioErrorStatus.GEO_SERVICE_NOT_AVAILABLE,
      details
    );
  }
}
