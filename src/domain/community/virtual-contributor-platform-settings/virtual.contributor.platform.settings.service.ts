import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { IVirtualContributorPlatformSettings } from './virtual.contributor.platform.settings.interface';
import { UpdateVirtualContributorPlatformSettingsEntityInput } from './dto/virtual.contributor.platform.settings.dto.update';

@Injectable()
export class VirtualContributorPlatformSettingsService {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  public updateSettings(
    settings: IVirtualContributorPlatformSettings | undefined,
    updateData: UpdateVirtualContributorPlatformSettingsEntityInput
  ): IVirtualContributorPlatformSettings {
    const currentSettings: IVirtualContributorPlatformSettings =
      settings ??
      ({
        promptGraphEditingEnabled: true,
      } as IVirtualContributorPlatformSettings);

    const updatedSettings: IVirtualContributorPlatformSettings = {
      ...currentSettings,
    };

    if (updateData.promptGraphEditingEnabled !== undefined) {
      updatedSettings.promptGraphEditingEnabled =
        updateData.promptGraphEditingEnabled;
    }

    return updatedSettings;
  }
}
