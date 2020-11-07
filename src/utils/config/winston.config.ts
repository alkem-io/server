import { Injectable } from '@nestjs/common';
import * as winston from 'winston';
import { utilities as nestWinstonModuleUtilities } from 'nest-winston';

@Injectable()
export class WinstonConfigService {
  async createWinstonModuleOptions() {
    return {
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.timestamp(),
            nestWinstonModuleUtilities.format.nestLike()
          ),
          level:
            process.env.LOGGING_LEVEL?.toLowerCase() ||
            LOGGING_LEVEL.Error.toString().toLowerCase(),
        }),
        // other transports...
      ],
    };
  }
}

export enum LOGGING_LEVEL {
  Error = 0,
  Warn = 1,
  Info = 2,
  Http = 3,
  Verbose = 4,
  Debug = 5,
  Silly = 6,
}
