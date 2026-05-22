import { PlatformAuditCategory } from './enums/platform.audit.category';
import { PlatformAuditInitiatorRole } from './enums/platform.audit.initiator.role';
import { PlatformAuditOutcome } from './enums/platform.audit.outcome';

/**
 * Optional cross-category request-context block reserved for future ISO 27001
 * categories. This spec does NOT populate it; it is documented here so future
 * categories don't each invent their own shape.
 */
export interface AuditRequestContext {
  ip?: string;
  userAgent?: string;
  requestId?: string;
}

/**
 * Email-change category payload shape. The audit-service projects these keys
 * into and out of the `platform_audit_entry.details` JSONB column.
 *
 * Token-leakage guard: this shape MUST NOT carry a `token` field. Companion
 * spec 098's verification-flow service is responsible for ensuring that the
 * confirmation token it issues is never mirrored into the audit-entry payload.
 */
/**
 * Free-text identification of the person who authorized the change within the
 * subject's organization. Distinct from the platform admin who *operated* the
 * mutation (recorded as `initiatorUserId`): the approver is the organizational
 * authority that sanctioned it (e.g. the org admin of the public-administration
 * body the subject belongs to). Free-text because that authorizer is not
 * necessarily an Alkemio account holder.
 */
export interface EmailChangeApprover {
  name: string;
  role: string;
  organization?: string;
}

export interface EmailChangeAuditDetails {
  oldEmail?: string;
  newEmail?: string;
  /**
   * Admin-supplied justification for the change. Required by the platform-admin
   * synchronous flow (`adminUserEmailChange`), where the admin overrides a
   * user's login email without the new mailbox proving ownership; absent for
   * the self-service flow (spec 098), which has no admin actor.
   */
  reason?: string;
  /**
   * Who authorized the change within the subject's organization. Required by
   * the platform-admin flow; absent for the self-service flow (spec 098).
   */
  approver?: EmailChangeApprover;
  requestContext?: AuditRequestContext;
}

/**
 * Discriminated union of per-category audit-entry payloads. Future ISO 27001
 * categories add their own narrow types here under the same union.
 */
export type PlatformAuditDetails = EmailChangeAuditDetails;

/**
 * Row shape of `platform_audit_entry`. Append-only; retained indefinitely
 * (data-model.md §Retention). Every typed column is cross-category; the
 * category-specific payload lives in `details`.
 */
export interface IPlatformAuditEntry {
  id: string;
  rowId: number;
  createdDate: Date;
  updatedDate: Date;
  version?: number;
  category: PlatformAuditCategory;
  subjectUserId: string;
  initiatorUserId?: string;
  initiatorRole: PlatformAuditInitiatorRole;
  outcome: PlatformAuditOutcome;
  failureReason?: string;
  correlationId?: string;
  details?: PlatformAuditDetails;
}
