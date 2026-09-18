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
  // Password-change category (observer flow): the platform observed a
  // Kratos-side password change and recorded it; the platform is not the
  // source of truth for the credential itself.
  OBSERVED = 'observed',
  // Platform-operations category (workspace#032): terminal outcome of one
  // execution of an operational/maintenance mutation.
  OPERATION_SUCCEEDED = 'operation_succeeded',
  OPERATION_FAILED = 'operation_failed',
  // MCP API key lifecycle (workspace#038).
  KEY_MINTED = 'key_minted',
  KEY_REVOKED = 'key_revoked',
  // Account deletion — primary outcome (written inside the deletion
  // transaction) and the outcomes of the post-commit external legs it
  // fans out to. A leg failure is recorded here and never fails the
  // deletion itself; `session_invalidation_failed` (above) is reused for a
  // failed session-revocation leg rather than adding a synonym.
  ACCOUNT_DELETED = 'account_deleted',
  IDENTITY_DELETION_COMPLETED = 'identity_deletion_completed',
  IDENTITY_DELETION_FAILED = 'identity_deletion_failed',
  FILE_BYTES_CLEANUP_COMPLETED = 'file_bytes_cleanup_completed',
  FILE_BYTES_CLEANUP_FAILED = 'file_bytes_cleanup_failed',
  SESSION_REVOCATION_COMPLETED = 'session_revocation_completed',
}
