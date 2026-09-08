import { OrganizationVerificationEnum } from '@common/enums/organization.verification';
import { IOrganizationSettings } from '@domain/community/organization-settings/organization.settings.interface';

export type OrganizationDomainJoinIneligibleReason =
  | 'DOMAIN_MISMATCH'
  | 'SWITCH_OFF'
  | 'NOT_VERIFIED';

export interface OrganizationDomainJoinEligibility {
  eligible: boolean;
  reason?: OrganizationDomainJoinIneligibleReason;
}

/**
 * The single owner of the "does this viewer's email domain let them join
 * this organization directly" rule (FR-016). Called by both existing
 * registration-time sites (`registration.service.ts`,
 * `user.identity.service.ts`) and the live join door (`joinRoleSet`'s
 * ORGANIZATION branch) — one predicate, so the two never drift.
 *
 * Pure and side-effect free: no lookups, no logging. Callers own resolving
 * `org` and the viewer's email domain, and own logging the outcome the way
 * each call site already does.
 *
 * Precedence (first failing check wins): domain match -> switch on ->
 * verified by manual attestation.
 */
export function isDomainJoinEligible(
  org: {
    domain?: string;
    settings: IOrganizationSettings;
    verification?: { status: OrganizationVerificationEnum };
  },
  viewerEmailDomain: string
): OrganizationDomainJoinEligibility {
  if (
    !org.domain ||
    org.domain.toLowerCase() !== viewerEmailDomain.toLowerCase()
  ) {
    return { eligible: false, reason: 'DOMAIN_MISMATCH' };
  }
  if (!org.settings.membership.allowUsersMatchingDomainToJoin) {
    return { eligible: false, reason: 'SWITCH_OFF' };
  }
  if (
    org.verification?.status !==
    OrganizationVerificationEnum.VERIFIED_MANUAL_ATTESTATION
  ) {
    return { eligible: false, reason: 'NOT_VERIFIED' };
  }
  return { eligible: true };
}
