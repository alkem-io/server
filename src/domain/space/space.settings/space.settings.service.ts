import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { UpdateSpaceSettingsEntityInput } from './dto/space.settings.dto.update';
import { ISpaceSettings } from './space.settings.interface';

@Injectable()
export class SpaceSettingsService {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

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
