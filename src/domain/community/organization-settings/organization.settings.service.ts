import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { UpdateOrganizationSettingsEntityInput } from './dto/organization.settings.dto.update';
import { IOrganizationSettings } from './organization.settings.interface';

@Injectable()
export class OrganizationSettingsService {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  public updateSettings(
    settings: IOrganizationSettings,
    updateData: UpdateOrganizationSettingsEntityInput
  ): IOrganizationSettings {
    if (updateData.privacy) {
      if (updateData.privacy.contributionRolesPubliclyVisible !== undefined) {
        settings.privacy.contributionRolesPubliclyVisible =
          updateData.privacy.contributionRolesPubliclyVisible;
      }
    }
    if (updateData.membership) {
      if (updateData.membership.allowUsersMatchingDomainToJoin !== undefined) {
        settings.membership.allowUsersMatchingDomainToJoin =
          updateData.membership.allowUsersMatchingDomainToJoin;
      }
    }
    return settings;
  }
}
