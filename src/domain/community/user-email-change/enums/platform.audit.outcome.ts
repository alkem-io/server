/**
 * Cross-category Postgres enum (`platform_audit_outcome`). Populated initially with
 * the 11 outcomes that the email-change feature writes — each category occupies its
 * own subset of values, enforced at the service layer rather than by DDL. Future
 * categories — and companion spec 098 — extend this enum additively via
 * `ALTER TYPE ... ADD VALUE`, which is non-breaking.
 *
 * String values are identical to the feature-scoped GraphQL
 * `UserEmailChangeAuditOutcome` enum for the same members so the projection layer
 * can narrow without value translation.
 */
export enum PlatformAuditOutcome {
  COMMITTED = 'committed',
  ROLLED_BACK = 'rolled_back',
  DRIFT_DETECTED = 'drift_detected',
  DRIFT_RESOLVED = 'drift_resolved',
  DRIFT_RESOLUTION_FAILED = 'drift_resolution_failed',
  SECURITY_SIGNAL_FAILED = 'security_signal_failed',
  NEW_ADDRESS_NOTIFICATION_FAILED = 'new_address_notification_failed',
  GLOBAL_ADMIN_NOTIFICATION_FAILED = 'global_admin_notification_failed',
  SESSION_INVALIDATION_FAILED = 'session_invalidation_failed',
  REJECTED_VALIDATION = 'rejected_validation',
  REJECTED_CONFLICT = 'rejected_conflict',
}
