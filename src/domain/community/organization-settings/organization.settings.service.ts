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
    // Every field below is `Boolean` (nullable) on the input type and carries
    // `@IsOptional()`, which skips validation for null as well as undefined.
    // An explicit `null` therefore reaches this method unvalidated, and a bare
    // `!== undefined` guard would write it into the jsonb settings column —
    // permanently breaking the non-null `Boolean!` output field, so every
    // later organization-settings query errors. Omission and explicit null
    // both mean "leave this setting alone".
    if (updateData.privacy) {
      if (updateData.privacy.contributionRolesPubliclyVisible != null) {
        settings.privacy.contributionRolesPubliclyVisible =
          updateData.privacy.contributionRolesPubliclyVisible;
      }
    }
    if (updateData.membership) {
      if (updateData.membership.allowUsersMatchingDomainToJoin != null) {
        settings.membership.allowUsersMatchingDomainToJoin =
          updateData.membership.allowUsersMatchingDomainToJoin;
      }
      if (updateData.membership.allowSpaceInvitations != null) {
        settings.membership.allowSpaceInvitations =
          updateData.membership.allowSpaceInvitations;
      }
    }
    return settings;
  }
}
