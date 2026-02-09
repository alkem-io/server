import { Injectable } from '@nestjs/common';
import { UpdateVirtualContributorPlatformSettingsEntityInput } from './dto/virtual.contributor.platform.settings.dto.update';
import { IVirtualContributorPlatformSettings } from './virtual.contributor.platform.settings.interface';

@Injectable()
export class VirtualContributorPlatformSettingsService {
  constructor() {}

  public updateSettings(
    settings: IVirtualContributorPlatformSettings,
    updateData: UpdateVirtualContributorPlatformSettingsEntityInput
  ): IVirtualContributorPlatformSettings {
    settings.promptGraphEditingEnabled = updateData.promptGraphEditingEnabled;

    return settings;
  }
}
