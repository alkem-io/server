import { Injectable } from '@nestjs/common';
import * as winston from 'winston';
import { utilities as nestWinstonModuleUtilities } from 'nest-winston';
import { ConfigService } from '@nestjs/config';
import { ILoggingConfig } from '@interfaces/logging.config.interface';
import * as WinstonElasticsearch from 'winston-elasticsearch';

@Injectable()
export class WinstonConfigService {
  constructor(private configService: ConfigService) {}

  async createWinstonModuleOptions() {
    const transports: any[] = [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.timestamp(),
          nestWinstonModuleUtilities.format.nestLike()
        ),
        level: this.configService.get<ILoggingConfig>('logging')?.loggingLevel,
        silent: !this.configService.get<ILoggingConfig>('logging')
          ?.consoleLoggingEnabled,
      }),
    ];

    if (this.configService.get<ILoggingConfig>('logging')?.elkConfig?.enabled) {
      transports.push(
        new WinstonElasticsearch.ElasticsearchTransport({
          level: this.configService.get<ILoggingConfig>('logging')?.elkConfig
            ?.loggingLevel,
          transformer: logData => {
            return {
              '@timestamp': new Date().getTime(),
              severity: logData.level,
              message: `[${logData.level}] LOG Message: ${logData.message}`,
              environment: this.configService.get<ILoggingConfig>('logging')
                ?.elkConfig?.environment as string,
              fields: { ...logData.meta },
            };
          },
          clientOpts: {
            cloud: {
              id: process.env.ELASTIC_CLOUD_ID || '',
            },
            auth: {
              username: process.env.ELASTIC_CLOUD_USERNAME || '',
              password: process.env.ELASTIC_CLOUD_PASSWORD || '',
            },
          },
        })
      );
    }

    return {
      transports: transports,
    };
  }
}
