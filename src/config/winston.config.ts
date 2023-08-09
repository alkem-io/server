import { Injectable } from '@nestjs/common';
import * as winston from 'winston';
import { utilities as nestWinstonModuleUtilities } from 'nest-winston';
import { ConfigService } from '@nestjs/config';
import { ConfigurationTypes } from '@common/enums';
import { FileTransportOptions } from 'winston/lib/winston/transports';
import * as logform from 'logform';

const LOG_LABEL = 'alkemio-server';

const consoleLoggingStandardFormat: logform.Format[] = [
  winston.format.timestamp(),
  nestWinstonModuleUtilities.format.nestLike(undefined, {
    colors: true,
    prettyPrint: false,
  }),
];

const consoleLoggingProdFormat: logform.Format[] = [
  winston.format.timestamp(),
  winston.format.label({ label: LOG_LABEL }),
  winston.format.json({ deterministic: true }),
];

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
          ...(this.configService.get(ConfigurationTypes.MONITORING)?.logging
            ?.json
            ? consoleLoggingProdFormat
            : consoleLoggingStandardFormat)
        ),
        level: this.configService
          .get(ConfigurationTypes.MONITORING)
          ?.logging?.level.toLowerCase(),
        silent: !consoleEnabled,
      }),
    ];

    const contextToFileConfig = this.configService.get(
      ConfigurationTypes.MONITORING
    )?.logging.context_to_file;
    if (contextToFileConfig.enabled) {
      const filename = contextToFileConfig.filename;

      function filterMessagesFormat(filterFunc: any) {
        const formatFunc = (info: any) => {
          if (filterFunc(info)) return info;
          return null;
        };

        const formatWrap = logform.format(formatFunc);
        const format = formatWrap();
        format.transform = formatFunc;

        return format;
      }

      const myFormat = winston.format.combine(
        winston.format.timestamp({
          format: 'MM-DD hh:mm:ss',
        }),
        winston.format.printf(
          (info: any) =>
            `${info.timestamp} ${info.level} [${info.context}] - ${info.message}`
        ),
        winston.format.align(),
        filterMessagesFormat(
          (info: any) =>
            info.context && info.context === contextToFileConfig.context
        )
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
