import { LogContext } from '@common/enums';

declare module '@nestjs/common/services/logger.service' {
  export interface LoggerService {
    log(message: string | Error, context: string): any;
    error(
      message: string | Error,
      stack: string | undefined,
      context: LogContext
    ): any;
    warn(message: string | Error, context: string): any;
    debug?(message: string | Error, context: string): any;
    verbose?(message: string | Error, context: string): any;
  }
}
