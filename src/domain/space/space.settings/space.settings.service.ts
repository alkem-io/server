import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { ISpaceSettings } from './space.settings.interface';
import { UpdateSpaceSettingsEntityInput } from './dto/space.settings.dto.update';

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

  public updateSettings(
    settings: ISpaceSettings,
    updateData: UpdateSpaceSettingsEntityInput
  ): ISpaceSettings {
    if (updateData.privacy) {
      if (updateData.privacy.mode) {
        settings.privacy.mode = updateData.privacy.mode;
      }
      if (updateData.privacy.allowPlatformSupportAsAdmin !== undefined) {
        settings.privacy.allowPlatformSupportAsAdmin =
          updateData.privacy.allowPlatformSupportAsAdmin;
      }
    }
    if (updateData.membership) {
      settings.membership = updateData.membership;
    }
    if (updateData.collaboration) {
      settings.collaboration = updateData.collaboration;
    }
    return settings;
  }
}
