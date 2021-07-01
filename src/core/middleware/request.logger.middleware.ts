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
  constructor(
    private readonly configService: ConfigService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  use(req: Request, res: Response, next: NextFunction) {
    const reqLogging: boolean = this.configService.get(
      ConfigurationTypes.Monitoring
    )?.logging?.requests?.fullLoggingEnabled;

    reqLogging &&
      this.logger.verbose &&
      this.logger.verbose(JSON.stringify(req, undefined, ' '));

    const reqHeadersLogging: boolean = this.configService.get(
      ConfigurationTypes.Monitoring
    )?.logging?.requests?.headerLoggingEnabled;

    !reqLogging &&
      reqHeadersLogging &&
      this.logger.verbose &&
      this.logger.verbose(JSON.stringify(req.headers, undefined, ' '));

    next();
  }
}
