import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { ISpaceSettings } from './space.settings.interface';

@Injectable()
export class SpaceSettingsService {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  public getSettings(settingsStr: string): ISpaceSettings {
    const states: ISpaceSettings = this.deserializeSettings(settingsStr);
    return states;
  }

  public serializeSettings(settings: ISpaceSettings): string {
    return JSON.stringify(settings);
  }

  private deserializeSettings(settingsStr: string): ISpaceSettings {
    return JSON.parse(settingsStr);
  }
}
