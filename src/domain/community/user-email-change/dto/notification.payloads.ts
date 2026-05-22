import {
  BaseEventPayload,
  NotificationEventPayloadSpace,
} from '@alkemio/notifications-lib';
import { UserEmailChangeInitiatorRole } from '../enums/user.email.change.initiator.role';
import { EmailChangeApprover } from '../platform.audit.entry.interface';

/**
 * Wire payloads for the four email-change notification events (research.md §R8).
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

/**
 * Fan-out to platform-admin recipient set (FR-016d). Published via
 * `buildBaseEventPayload`, so it carries the full BaseEventPayload envelope
 * (`eventType`, `triggeredBy`, `recipients`, `platform`) with a server-resolved
 * `recipients` array — the notifications service consumes that list directly.
 */
export interface UserEmailChangeGlobalAdminNotificationPayload
  extends BaseEventPayload {
  subjectProfileSummary: UserProfileSummaryPayload;
  oldEmail: string;
  newEmail: string;
  initiatorProfileSummary?: UserProfileSummaryPayload;
  initiatorRole: UserEmailChangeInitiatorRole;
  /**
   * Organizational authorizer of the change. Present for platform-admin
   * changes; absent for the self-service flow (spec 098).
   */
  approver?: EmailChangeApprover;
  /**
   * Admin-supplied justification for the change. Present for platform-admin
   * changes; absent for the self-service flow (spec 098).
   */
  reason?: string;
  commitTimestampISO8601: string;
  triggerOutcome: UserEmailChangeTriggerOutcome;
  subjectMemberships: SubjectMembershipsPayload;
  subjectGlobalRoles: string[];
}

/**
 * Per-space fan-out to a space's admins + leads (the space-admin email-change
 * notification). Published once per space the subject is a member of, via
 * `buildBaseEventPayload`, so it carries the full
 * BaseEventPayload envelope with a server-resolved `recipients` array (that
 * space's admins/leads, minus the subject, minus opted-out admins) plus the
 * single `space` it concerns — the notifications service consumes the list
 * directly.
 */
export interface UserEmailChangeSpaceAdminNotificationPayload
  extends NotificationEventPayloadSpace {
  subjectProfileSummary: UserProfileSummaryPayload;
  oldEmail: string;
  newEmail: string;
  initiatorProfileSummary?: UserProfileSummaryPayload;
  initiatorRole: UserEmailChangeInitiatorRole;
  commitTimestampISO8601: string;
  triggerOutcome: UserEmailChangeTriggerOutcome;
}
