/**
 * Vocabulary for subject-scoped session revocation (server#6315).
 *
 * These are TypeScript unions, NOT Postgres enums — this feature writes no DDL
 * and no `platform_audit_entry` row. See
 * `specs/107-oidc-session-revocation/research.md` R4 for the enum-collision
 * check against the in-flight `027-platform-role-redesign` work, which already
 * owns the database-side audit record for user deletion.
 */

/**
 * Closed set of causes for a revocation (FR-016).
 *
 * All five members ship up front even though only `account_deleted` has a live
 * caller today. Shipping one and widening later would force three separate
 * downstream PRs to edit this same line. The codebase already sets this
 * precedent — `PlatformAuditInitiatorRole` ships `SYSTEM`/`SERVICE` unused "so
 * future categories do not require an enum migration". Unused members of a
 * TypeScript union cost nothing at runtime.
 *
 * Reserved consumers:
 * - `password_changed` → client-web#10070, via `password-changed.consumer.ts`
 * - `email_changed`    → the admin email-change flow, which today revokes only
 *                        the Kratos session and leaves BFF/API access alive
 * - `admin_revoked` / `user_revoked` → server#6073's session-management UI
 */
export type SessionRevocationReason =
  | 'account_deleted'
  | 'password_changed'
  | 'email_changed'
  | 'admin_revoked'
  | 'user_revoked';

/**
 * Per-session result of the LOCAL teardown.
 *
 * `already_absent` is a success, not a failure: the index is advisory and may
 * name a sid whose payload has already expired or been signed out (keyspace
 * invariant I3). No tombstone is written for it — there is nothing left to
 * tombstone, and inventing one would resurrect a 401 for a session that had
 * already ended cleanly.
 */
export type SessionRevocationOutcome =
  | 'revoked'
  | 'already_terminated'
  | 'already_absent'
  | 'skipped_excepted'
  | 'failed';

/**
 * Per-session result of the REMOTE (RFC 7009) refresh-token revocation.
 *
 * Reported separately from `SessionRevocationOutcome` on purpose. FR-013
 * requires the local teardown to stand regardless of what the authorization
 * server does, so collapsing the two would make "locally dead, remotely
 * unknown" indistinguishable from "still alive" — the exact conflation this
 * whole feature exists to remove.
 */
export type TokenRevocationOutcome = 'revoked' | 'failed' | 'skipped';

export type SessionRevocationEntry = {
  sid: string;
  outcome: SessionRevocationOutcome;
  tokenRevocation: TokenRevocationOutcome;
  /**
   * Redacted, non-leaking cause. Populated only when `outcome === 'failed'` or
   * `tokenRevocation === 'failed'`. MUST NOT contain token material (FR-021).
   */
  failureReason?: string;
};

export type SessionRevocationReport = {
  sub: string;
  reason: SessionRevocationReason;
  correlationId: string;
  entries: SessionRevocationEntry[];
  /**
   * Counts ONLY `outcome === 'revoked'`. `already_terminated` and
   * `already_absent` are successes but are not revocations this call performed;
   * conflating them would inflate the audit trail with sessions it did not end.
   */
  revokedCount: number;
  failedCount: number;
  /** True iff no entry failed locally and none failed remotely. */
  complete: boolean;
};

export type RevokeAllForSubOptions = {
  /**
   * Leave this one session alive. OWASP ASVS V3.3.2 ("terminate all *other*
   * active sessions after a password change") — needed unchanged by
   * client-web#10070 and by server#6073's `scope=others`.
   */
  exceptSid?: string;
  /** Propagated into every audit record; generated when absent. */
  correlationId?: string;
};
