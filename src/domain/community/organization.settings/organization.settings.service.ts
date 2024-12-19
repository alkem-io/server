import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { IOrganizationSettings } from './organization.settings.interface';
import { UpdateOrganizationSettingsEntityInput } from './dto/organization.settings.dto.update';

@Injectable()
export class OrganizationSettingsService {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  public getSettings(settingsStr: string): IOrganizationSettings {
    const states: IOrganizationSettings = this.deserializeSettings(settingsStr);
    return states;
  }

  public serializeSettings(settings: IOrganizationSettings): string {
    return JSON.stringify(settings);
  }

  private deserializeSettings(settingsStr: string): IOrganizationSettings {
    return JSON.parse(settingsStr);
  }

  public updateSettings(
    settings: IOrganizationSettings,
    updateData: UpdateOrganizationSettingsEntityInput
  ): IOrganizationSettings {
    if (updateData.privacy) {
      if (updateData.privacy.contributionRolesPubliclyVisible) {
        settings.privacy.contributionRolesPubliclyVisible =
          updateData.privacy.contributionRolesPubliclyVisible;
      }
    }
    if (updateData.membership?.allowUsersMatchingDomainToJoin) {
      settings.membership.allowUsersMatchingDomainToJoin =
        updateData.membership.allowUsersMatchingDomainToJoin;
    }
    return settings;
  }
}
