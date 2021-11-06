import {
  Injectable,
  NestMiddleware,
  LoggerService,
  Inject,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { ConfigService } from '@nestjs/config';
import { ConfigurationTypes, LogContext } from '@common/enums';

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  private fullRequestLogging = false;
  private headerRequestLogging = false;
  constructor(
    private readonly configService: ConfigService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {
    const reqLoggingConfig = this.configService.get(
      ConfigurationTypes.MONITORING
    )?.logging?.requests;
    this.fullRequestLogging = reqLoggingConfig?.full_logging_enabled;
    this.headerRequestLogging = reqLoggingConfig?.headers_logging_enabled;
  }

  use(req: Request, res: Response, next: NextFunction) {
    this.logger.verbose?.(
      `Request to server: ${req.path}`,
      LogContext.REQUESTS
    );
    if (this.fullRequestLogging && this.logger.verbose)
      this.logger.verbose(
        JSON.stringify(req, undefined, ' '),
        LogContext.REQUESTS
      );

    if (
      !this.fullRequestLogging &&
      this.headerRequestLogging &&
      this.logger.verbose
    )
      this.logger.verbose?.(
        JSON.stringify(req.headers, undefined, ' '),
        LogContext.REQUESTS
      );

    next();
  }
}
