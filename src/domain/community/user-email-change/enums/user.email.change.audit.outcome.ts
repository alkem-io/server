import { registerEnumType } from '@nestjs/graphql';

/**
 * GraphQL feature-scoped enum exposing the email-change audit outcomes (FR-014b).
 *
 * String values intentionally match `PlatformAuditOutcome` for the same members so
 * the projection layer can narrow the cross-category Postgres enum to this enum via
 * a runtime type-guard with no value translation. GraphQL clients see the UPPERCASE
 * member names (e.g. `COMMITTED`); the underlying Postgres / TypeORM column stores
 * the lowercase string values.
 *
 * Note: `PlatformAuditOutcome` additionally carries `COMMIT_STARTED` — an internal
 * crash-window breadcrumb (research.md §R15) that is intentionally NOT exposed here.
 * The repository filters those rows out of its GraphQL-facing read methods, so a
 * `commit_started` row never reaches this projection.
 */
export enum UserEmailChangeAuditOutcome {
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
}

registerEnumType(UserEmailChangeAuditOutcome, {
  name: 'UserEmailChangeAuditOutcome',
  description:
    'Outcome recorded for a single user-email-change audit entry. Spec 098 extends this enum additively with verification-flow outcomes.',
});
