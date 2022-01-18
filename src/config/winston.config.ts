import { Injectable } from '@nestjs/common';
import * as winston from 'winston';
import { utilities as nestWinstonModuleUtilities } from 'nest-winston';
import { ConfigService } from '@nestjs/config';
import * as WinstonElasticsearch from 'winston-elasticsearch';
import { ConfigurationTypes } from '@common/enums';
import { FileTransportOptions } from 'winston/lib/winston/transports';

@Injectable()
export class WinstonConfigService {
  constructor(private configService: ConfigService) {}

  async createWinstonModuleOptions() {
    const consoleEnabled: boolean = this.configService.get(
      ConfigurationTypes.MONITORING
    )?.logging?.console_logging_enabled;
    const transports: any[] = [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.timestamp(),
          nestWinstonModuleUtilities.format.nestLike()
        ),
        level: this.configService
          .get(ConfigurationTypes.MONITORING)
          ?.logging?.level.toLowerCase(),
        silent: !consoleEnabled,
      }),
    ];

    if (
      this.configService.get(ConfigurationTypes.MONITORING)?.elastic?.enabled
    ) {
      transports.push(
        new WinstonElasticsearch.ElasticsearchTransport({
          level: this.configService.get(ConfigurationTypes.MONITORING)?.elastic
            ?.logging_level,
          transformer: logData => {
            return {
              '@timestamp': new Date().getTime(),
              severity: logData.level,
              message: `[${logData.level}] LOG Message: ${logData.message}`,
              environment: this.configService.get(ConfigurationTypes.HOSTING)
                ?.environment as string,
              fields: { ...logData.meta },
            };
          },
          clientOpts: {
            cloud: {
              id: this.configService.get(ConfigurationTypes.MONITORING)?.elastic
                ?.cloud?.id,
            },
            auth: {
              username: this.configService.get(ConfigurationTypes.MONITORING)
                ?.elastic?.cloud?.username,
              password: this.configService.get(ConfigurationTypes.MONITORING)
                ?.elastic?.cloud?.password,
            },
          },
        })
      );
    }

    const contextToFileConfig = this.configService.get(
      ConfigurationTypes.MONITORING
    )?.logging.context_to_file;
    if (contextToFileConfig.enabled) {
      // todo: enable from config
      const filename = contextToFileConfig.filename;

      const filterFunc = (info: any) => {
        if (info.context && info.context === contextToFileConfig.context) {
          return `${info.timestamp} ${info.level} ${info.context}: ${info.message}`;
        }
        return '';
      };

      const myFormat = winston.format.combine(
        winston.format.timestamp(),
        winston.format.align(),
        winston.format.printf(filterFunc)
      );

      const fileTransportOptions: FileTransportOptions = {
        format: myFormat,
        level: this.configService
          .get(ConfigurationTypes.MONITORING)
          ?.logging?.level.toLowerCase(),
        silent: false,
        filename: filename,
      };
      transports.push(new winston.transports.File(fileTransportOptions));
    }

    return {
      transports: transports,
    };
  }
}
