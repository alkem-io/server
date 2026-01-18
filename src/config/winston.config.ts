import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AlkemioConfig } from '@src/types';
import * as logform from 'logform';
import { utilities as nestWinstonModuleUtilities } from 'nest-winston';
import * as winston from 'winston';
import { FileTransportOptions } from 'winston/lib/winston/transports';

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
  constructor(private configService: ConfigService<AlkemioConfig, true>) {}

  async createWinstonModuleOptions() {
    const consoleEnabled: boolean = this.configService.get(
      'monitoring.logging.console_logging_enabled',
      { infer: true }
    );

    const transports: any[] = [
      new winston.transports.Console({
        format: winston.format.combine(
          ...(this.configService.get('monitoring.logging', { infer: true })
            ?.json
            ? consoleLoggingProdFormat
            : consoleLoggingStandardFormat)
        ),
        level: this.configService
          .get('monitoring.logging.level', { infer: true })
          .toLowerCase(),
        silent: !consoleEnabled,
      }),
    ];

    const contextToFileConfig = this.configService.get(
      'monitoring.logging.context_to_file',
      { infer: true }
    );
    if (contextToFileConfig.enabled) {
      const filename = contextToFileConfig.filename;

      const filterMessagesFormat = (filterFunc: any) => {
        const formatFunc = (info: any) => {
          if (filterFunc(info)) return info;
          return null;
        };

        const formatWrap = logform.format(formatFunc);
        const format = formatWrap();
        format.transform = formatFunc;

        return format;
      };

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
          .get('monitoring.logging.level', { infer: true })
          .toLowerCase(),
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
