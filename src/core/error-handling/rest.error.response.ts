import { AlkemioErrorStatus, LogContext } from '@common/enums';

export interface RestErrorResponse {
  statusCode: number;
  timestamp: string;
  message: string;
  code: AlkemioErrorStatus;
  context?: LogContext;
  stack?: string;
}
