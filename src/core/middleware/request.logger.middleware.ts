import {
  Injectable,
  NestMiddleware,
  LoggerService,
  Inject,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { ConfigService } from '@nestjs/config';
import { LogContext } from '@common/enums';
import { AlkemioConfig } from '@src/types';

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  private readonly requestFullLogging = false;
  private readonly requestHeadersLogging = false;
  private readonly responseHeadersLogging = false;
  constructor(
    private readonly configService: ConfigService<AlkemioConfig, true>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {
    const reqLoggingConfig = this.configService.get(
      'monitoring.logging.requests',
      { infer: true }
    );
    this.requestFullLogging = reqLoggingConfig?.full_logging_enabled;
    this.requestHeadersLogging = reqLoggingConfig?.headers_logging_enabled;

    const resLoggingConfig = this.configService.get(
      'monitoring.logging.responses',
      { infer: true }
    );
    this.responseHeadersLogging = resLoggingConfig?.headers_logging_enabled;
  }

  use(req: Request, response: Response, next: NextFunction) {
    if (this.logger.verbose) {
      if (this.requestHeadersLogging) {
        this.logger.verbose?.(
          `Request to server: ${req.path}`,
          LogContext.REQUESTS
        );
      }
      // Also log the response code
      response.on('close', () => {
        const { statusCode } = response;

        if (this.responseHeadersLogging) {
          this.logger.verbose?.(
            `Response from server: ${statusCode}`,
            LogContext.REQUESTS
          );

          const headers = JSON.stringify(response.getHeaders(), undefined, ' ');
          this.logger.verbose?.(
            `Response headers: ${headers}`,
            LogContext.REQUESTS
          );
        }
      });

      if (this.requestFullLogging)
        this.logger.verbose(
          JSON.stringify(req, undefined, ' '),
          LogContext.REQUESTS
        );

      if (this.requestHeadersLogging) {
        const headers = JSON.stringify(req.headers, undefined, ' ');
        this.logger.verbose?.(
          `Request headers: ${headers}`,
          LogContext.REQUESTS
        );
      }
    }
    next();
  }
}
