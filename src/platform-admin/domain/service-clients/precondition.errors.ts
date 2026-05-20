/**
 * Precondition errors for the service-client admin surface.
 *
 * Shared shape (per Clarifications Session 2026-05-20): every error carries
 *   - `code`         — stable machine-readable discriminator surfaced under
 *                      `errors[].extensions.code` in the GraphQL response;
 *                      mirrors the error-shape table in
 *                      `contracts/admin-graphql-service-clients.md`.
 *   - `remediation`  — the **exact** corrective mutation the admin must
 *                      invoke first; bubbles up as
 *                      `errors[].extensions.detail` so the admin pane can
 *                      render a one-click "do that first" affordance.
 *
 * Constraining FRs: FR-003, FR-004a, FR-007a, FR-006.
 *
 * Gating note: these errors are only thrown AFTER `grantAccessOrFail`
 * succeeds for the calling admin — non-admin callers never see a
 * `STATUS_PRECONDITION` / `DANGLING_OWNER_FK` / `BASELINE_PRECONDITION`
 * code; they uniformly see `FORBIDDEN` (FR-006 indistinguishability).
 */

/**
 * Discriminator union of all precondition error codes. The string values
 * mirror the `extensions.code` table in the admin contract.
 */
export type PreconditionErrorCode =
  | 'STATUS_PRECONDITION'
  | 'DANGLING_OWNER_FK'
  | 'BASELINE_PRECONDITION';

export abstract class ServiceClientPreconditionError extends Error {
  /** Stable discriminator; surfaces as `extensions.code`. */
  public abstract readonly code: PreconditionErrorCode;

  /**
   * Human-readable corrective mutation the admin must invoke first.
   * Surfaces as `extensions.detail` so the admin pane can render the
   * remediation affordance verbatim.
   */
  public readonly remediation: string;

  protected constructor(message: string, remediation: string) {
    super(message);
    this.name = new.target.name;
    this.remediation = remediation;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * FR-003 — `rotateServiceClientSecret` called on a `status: disabled`
 * client. The atomic cutover semantics of rotate are meaningless on a
 * disabled client; the admin MUST re-enable first (which mints a fresh
 * secret as part of the same atomic operation per FR-004a).
 */
export class RotateOnDisabledError extends ServiceClientPreconditionError {
  public readonly code: PreconditionErrorCode = 'STATUS_PRECONDITION';

  constructor(clientId: string) {
    super(
      `Cannot rotate secret on disabled service client '${clientId}'; re-enable it first (re-enable mints a fresh secret atomically).`,
      `invoke reEnableServiceClient(clientId: "${clientId}") first`
    );
  }
}

/**
 * FR-004a — `reEnableServiceClient` called on a client that is already
 * `status: enabled`. The corrective action — if the admin's intent was to
 * rotate the secret — is the rotate mutation.
 */
export class ReEnableOnEnabledError extends ServiceClientPreconditionError {
  public readonly code: PreconditionErrorCode = 'STATUS_PRECONDITION';

  constructor(clientId: string) {
    super(
      `Service client '${clientId}' is already enabled; nothing to re-enable.`,
      `invoke rotateServiceClientSecret(clientId: "${clientId}") if a fresh secret is needed`
    );
  }
}

/**
 * FR-007a — `removePlatformScope` called on a row whose
 * `readOnlyBaseline = true`. Removing a baseline scope would
 * silently shrink the FR-005 default-grant set; the admin must
 * opt the scope out of the baseline first as an explicit auditable step.
 */
export class RemoveBaselineScopeError extends ServiceClientPreconditionError {
  public readonly code: PreconditionErrorCode = 'BASELINE_PRECONDITION';

  constructor(scopeName: string) {
    super(
      `Cannot remove platform scope '${scopeName}' while it is in the FR-005 read-only baseline.`,
      `invoke setPlatformScopeBaselineMembership(input: { name: "${scopeName}", readOnlyBaseline: false }) first`
    );
  }
}

/**
 * FR-004a — `reEnableServiceClient` whose target's `owner_user_id` no
 * longer resolves to an existing platform User (User-deletion flow has
 * already nulled the FK). Re-enabling without an owner would produce a
 * dangling-FK row in the catalogue; admin must reassign first.
 */
export class DanglingOwnerFkError extends ServiceClientPreconditionError {
  public readonly code: PreconditionErrorCode = 'DANGLING_OWNER_FK';

  constructor(clientId: string) {
    super(
      `Cannot re-enable service client '${clientId}': its previous owner User no longer exists.`,
      `invoke reassignServiceClientOwner(input: { clientId: "${clientId}", newOwnerUserId: <existing user id> }) first`
    );
  }
}
