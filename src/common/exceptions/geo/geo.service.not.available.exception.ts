import { AlkemioErrorStatus, LogContext } from '@common/enums';
import { BaseHttpException } from '@common/exceptions/http';
import { HttpStatus } from '@nestjs/common';
import { ExceptionDetails } from '@common/exceptions/exception.details';

export class GeoServiceNotAvailableException extends BaseHttpException {
  constructor(error: string, context: LogContext, details?: ExceptionDetails) {
    super(
      error,
      HttpStatus.METHOD_NOT_ALLOWED,
      context,
      AlkemioErrorStatus.GEO_SERVICE_NOT_AVAILABLE,
      details
    );
  }
}
