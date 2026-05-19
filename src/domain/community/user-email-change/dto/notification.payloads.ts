import { UserEmailChangeInitiatorRole } from '../enums/user.email.change.initiator.role';

/**
 * Wire payloads for the three email-change notification events (research.md §R8).
 *
 * These shapes are mirrored by template classes in `@alkemio/notifications-lib`;
 * the typings are duplicated here so the server can publish the events without
 * waiting for the lib bump that adds the equivalent typed classes. When the lib
 * exposes them, callers can swap the imports without changing the wire payload.
 */

/** Sent to the OLD address (FR-016). Masked new address. */
export interface UserEmailChangeSecuritySignalPayload {
  recipientEmail: string;
  commitTimestampISO8601: string;
  initiatorRole: UserEmailChangeInitiatorRole;
  newEmailMasked: string;
}

/** Sent to the NEW address (FR-016c). Full new address, login deep link. */
export interface UserEmailChangeNewAddressNotificationPayload {
  recipientEmail: string;
  commitTimestampISO8601: string;
  initiatorRole: UserEmailChangeInitiatorRole;
  newEmailFull: string;
  loginUrl: string;
}

export type UserEmailChangeTriggerOutcome = 'COMMITTED' | 'DRIFT_DETECTED';

export interface UserProfileSummaryPayload {
  id: string;
  displayName: string;
}

export interface SubjectSpaceMembership {
  spaceId: string;
  level: string;
  roles: string[];
}

export interface SubjectOrganizationMembership {
  organizationId: string;
  roles: string[];
}

/**
 * Snapshot of a subject user's organisational footprint at the moment of the
 * triggering audit event. Identifiers + role tags only — the downstream
 * notifications-service resolves admin / lead user-ids at delivery time to avoid
 * the stale-recipient race window described in research.md §R8.
 */
export interface SubjectMembershipsPayload {
  spaces: SubjectSpaceMembership[];
  organizations: SubjectOrganizationMembership[];
}

/** Fan-out to platform-admin recipient set (FR-016d). */
export interface UserEmailChangeGlobalAdminNotificationPayload {
  subjectProfileSummary: UserProfileSummaryPayload;
  oldEmail: string;
  newEmail: string;
  initiatorProfileSummary?: UserProfileSummaryPayload;
  initiatorRole: UserEmailChangeInitiatorRole;
  commitTimestampISO8601: string;
  triggerOutcome: UserEmailChangeTriggerOutcome;
  subjectMemberships: SubjectMembershipsPayload;
  subjectGlobalRoles: string[];
}
