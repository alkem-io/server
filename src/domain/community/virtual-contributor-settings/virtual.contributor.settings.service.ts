import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { IVirtualContributorSettings } from './virtual.contributor.settings.interface';
import { UpdateVirtualContributorSettingsEntityInput } from './dto/virtual.contributor.settings.dto.update';

@Injectable()
export class VirtualContributorSettingsService {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  public updateSettings(
    settings: IVirtualContributorSettings,
    updateData: UpdateVirtualContributorSettingsEntityInput
  ): IVirtualContributorSettings {
    if (updateData.privacy) {
      if (updateData.privacy.contributionRolesPubliclyVisible !== undefined) {
        settings.privacy.contributionRolesPubliclyVisible =
          updateData.privacy.contributionRolesPubliclyVisible;
      }
    }
    return settings;
  }
}
