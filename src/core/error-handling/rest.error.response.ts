import { AlkemioErrorStatus, LogContext } from '@common/enums';
import { ExceptionDetails } from '@common/exceptions/exception.details';

export interface RestErrorResponse {
  statusCode: number;
  timestamp: string;
  message: string;
  code: AlkemioErrorStatus;
  details?: ExceptionDetails;
  context?: LogContext;
  stack?: string;
}
