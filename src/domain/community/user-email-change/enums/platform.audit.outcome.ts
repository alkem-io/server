/**
 * Cross-category Postgres enum (`platform_audit_outcome`). The email-change feature
 * writes 13 of these values — each category occupies its own subset, enforced at the
 * service layer rather than by DDL. Future categories — and companion spec 098 —
 * extend this enum additively via `ALTER TYPE ... ADD VALUE`, which is non-breaking.
 *
 * String values are identical to the feature-scoped GraphQL
 * `UserEmailChangeAuditOutcome` enum for the same members so the projection layer
 * can narrow without value translation — with ONE exception: `COMMIT_STARTED` is an
 * internal crash-window breadcrumb (written before the forward Kratos write so a
 * process death mid-commit leaves a durable trail — see
 * `user.email.change.service.ts` and research.md §R15). It is deliberately NOT
 * projected to the GraphQL enum; the repository's GraphQL-facing read methods filter
 * it out.
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
  SPACE_ADMIN_NOTIFICATION_FAILED = 'space_admin_notification_failed',
  SESSION_INVALIDATION_FAILED = 'session_invalidation_failed',
  REJECTED_VALIDATION = 'rejected_validation',
  REJECTED_CONFLICT = 'rejected_conflict',
  COMMIT_STARTED = 'commit_started',
}
