import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { UpdateOrganizationSettingsEntityInput } from './dto/organization.settings.dto.update';
import { IOrganizationSettings } from './organization.settings.interface';

/** An off→on or on→off of an organisation's second-factor rule. */
export type OrganizationSecurityTransition = {
  from: boolean;
  to: boolean;
  /** The ISO switch-on time in force after the transition. */
  since: string | null;
};

@Injectable()
export class OrganizationSettingsService {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  public updateSettings(
    settings: IOrganizationSettings,
    updateData: UpdateOrganizationSettingsEntityInput
  ): {
    settings: IOrganizationSettings;
    transition?: OrganizationSecurityTransition;
  } {
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
      if (updateData.membership.allowApplications != null) {
        settings.membership.allowApplications =
          updateData.membership.allowApplications;
      }
    }

    const requested = updateData.security?.secondFactorRequired;
    const from = settings.security?.secondFactorRequired === true;
    if (requested == null || requested === from) {
      return { settings };
    }
    // Only an off→on moves the switch-on time; any other save keeps the
    // stored value exactly as it is.
    const since = requested
      ? new Date().toISOString()
      : (settings.security?.secondFactorRequiredSince ?? null);
    settings.security = {
      secondFactorRequired: requested,
      secondFactorRequiredSince: since,
    };
    return { settings, transition: { from, to: requested, since } };
  }
}
