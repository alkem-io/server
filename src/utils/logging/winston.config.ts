import { Injectable } from '@nestjs/common';
import * as winston from 'winston';
import { utilities as nestWinstonModuleUtilities } from 'nest-winston';
import { ConfigService } from '@nestjs/config';
import { ILoggingConfig } from '../../interfaces/logging.config.interface';

@Injectable()
export class WinstonConfigService {
  constructor(private configService: ConfigService) {}

  async createWinstonModuleOptions() {
    return {
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.timestamp(),
            nestWinstonModuleUtilities.format.nestLike()
          ),
          level: this.configService.get<ILoggingConfig>('logging')
            ?.loggingLevel,
        }),
        // other transports...
      ],
    };
  }
}
