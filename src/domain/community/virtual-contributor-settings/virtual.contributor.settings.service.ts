import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { UpdateVirtualContributorSettingsEntityInput } from './dto/virtual.contributor.settings.dto.update';
import { IVirtualContributorSettings } from './virtual.contributor.settings.interface';

@Injectable()
export class VirtualContributorSettingsService {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  public updateSettings(
    settings: IVirtualContributorSettings,
    updateData: UpdateVirtualContributorSettingsEntityInput
  ): IVirtualContributorSettings {
    const updatedSettings = {
      ...settings,
      privacy: {
        ...settings.privacy,
      },
    };
    if (updateData.privacy) {
      if (updateData.privacy.knowledgeBaseContentVisible !== undefined) {
        updatedSettings.privacy.knowledgeBaseContentVisible =
          updateData.privacy.knowledgeBaseContentVisible;
      }
    }
    return updatedSettings;
  }
}
