import {
  Injectable,
  NestMiddleware,
  LoggerService,
  Inject,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { ConfigService } from '@nestjs/config';
import { ConfigurationTypes } from '@common/enums';

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  private fullRequestLogging = false;
  private headerRequestLogging = false;
  constructor(
    private readonly configService: ConfigService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {
    this.fullRequestLogging = this.configService.get(
      ConfigurationTypes.MONITORING
    )?.logging?.requests?.full_logging_enabled;

    this.headerRequestLogging = this.configService.get(
      ConfigurationTypes.MONITORING
    )?.logging?.requests?.headerLoggingEnabled;
  }

  use(req: Request, res: Response, next: NextFunction) {
    if (this.fullRequestLogging && this.logger.verbose)
      this.logger.verbose(JSON.stringify(req, undefined, ' '));

    if (
      !this.fullRequestLogging &&
      this.headerRequestLogging &&
      this.logger.verbose
    )
      this.logger.verbose(JSON.stringify(req.headers, undefined, ' '));

    next();
  }
}
