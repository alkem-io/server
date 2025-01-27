import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { IPlatformSettings } from './platform.settings.interface';
import { UpdatePlatformSettingsEntityInput } from './dto/platform.settings.dto.update';

@Injectable()
export class PlatformSettingsService {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  public updateSettings(
    settings: IPlatformSettings,
    updateData: UpdatePlatformSettingsEntityInput
  ): IPlatformSettings {
    if (updateData.privacy) {
      if (updateData.privacy.contributionRolesPubliclyVisible !== undefined) {
        settings.privacy.contributionRolesPubliclyVisible =
          updateData.privacy.contributionRolesPubliclyVisible;
      }
    }
    return settings;
  }
}
