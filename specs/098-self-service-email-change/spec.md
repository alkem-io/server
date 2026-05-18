# Feature Specification: Self-Service Email Change With Ownership Verification

**Feature Branch**: `098-self-service-email-change`
**Created**: 2026-05-18
**Last Updated**: 2026-05-18 (verification machinery moved here from 097)
**Status**: Draft
**Input**: Split from `097-change-user-email` on 2026-05-18 — this spec adds the user-initiated path AND the full email-ownership verification flow on top of the admin foundation.

**Related Issues**:

- alkem-io/server#6064 — Allow changing a user's login email while preserving their Alkemio profile (motivating issue, shared with 097)

**Related Specs**:

- **097 — Platform Admin Change User Login Email (No Verification)** (foundational dependency). Owns: the `email_change_audit_entry` entity (the audit log), the two-side commit with bounded synchronous retry and compensating rollback, the drift detection path, the admin-only `adminUserEmailChangeDriftResolve` reconciliation mutation, the validation pipeline (format / no-change / conflict), the post-commit security-signal notification to the old address (FR-016 family), the session-invalidation on commit (FR-017 family), and the `email_change_initiator_role` Postgres enum (which already carries both `self` and `platform_admin` values upfront). This spec ADDS, on top of that foundation, the verification machinery: the `email_change_pending` entity, the token (TTL, entropy, plaintext storage, single-use, supersession), the multi-step `initiated → confirmed → committed` state lifecycle, the FR-004a confirm-time uniqueness re-check, the FR-019a atomic-initiation-with-mail-send guarantee, the confirmation message (sent to the new mailbox), the `userEmailChangeConfirm` root mutation (session-less, token = sole authority), the `meUserEmailChangeBegin` self-service initiation mutation, and the `me.pendingEmailChange` subject-user read query.

**Why verification lives here (and not in 097)**: 097 is the admin support flow. The admin verifies the subject user's identity out-of-band (support call, ID check) before invoking the synchronous mutation; no platform-mediated proof-of-ownership of the new mailbox is needed because the admin's authorization already gates the operation. The self-service flow contracted here has no admin in the loop, so the platform itself MUST prove that the new mailbox is controlled by the subject user before committing the change. The verification machinery (token + confirmation message + multi-step lifecycle) is the mechanism for that proof.

## User Scenarios & Testing _(mandatory)_

### User Story 1 — User Changes Their Own Login Email With Ownership Verification (Priority: P1)

As a registered Alkemio user, I want to change the email address I use to log in by proving ownership of the new mailbox, so that I can move authentication to a new mailbox (e.g., after a job change or provider migration) without losing my profile, memberships, contributions, or history, and without needing to contact a platform administrator.

**Why this priority**: This is the only user-facing self-service capability. Without it, every user-initiated email change requires admin intervention via 097's flow. The verification step (clicking a confirmation link in the new mailbox) is what makes the flow safe to expose to users directly.

**Independent Test**: A logged-in user requests an email change to a new address, receives a confirmation message at that new address, clicks the link, and is then able to log in only with the new address — the old address no longer authenticates. The user's profile id, memberships, and content remain unchanged. The user can additionally observe their pending change (and, after a partial-failure rollback or drift event, observe the resulting state) via the `me.pendingEmailChange` query introduced here.

**Acceptance Scenarios**:

1. **Given** a logged-in user with a valid login email, **When** the user requests to change their email to a new, unused address, **Then** the platform sends a confirmation message to the new address and records a pending change in state `initiated` without yet altering the login email. The pending change is also visible via the user's own `me.pendingEmailChange` query.
2. **Given** a pending email change with an unexpired confirmation token, **When** the user proves ownership of the new address (clicks the confirmation link in the message sent to that address), **Then** the platform re-validates uniqueness (per FR-004a), commits the change on both the identity provider and the Alkemio user record, invalidates the user's existing identity-provider sessions, and sends a post-commit security-signal notification to the old address — reusing the foundational behaviour contracted in 097.
3. **Given** the user has completed the change, **When** they attempt to log in with the new address, **Then** authentication succeeds; **When** they attempt to log in with the old address, **Then** authentication is rejected.
4. **Given** the user has completed the change, **When** they view their profile, **Then** all memberships, contributions, and historical references are intact and continue to reference the same user identity.

---

### User Story 2 — Confirmation Token Lifecycle (Priority: P2)

As a security-conscious platform, I want confirmation tokens to be short-lived, single-use, and bound to the specific (user, proposed new email) pair, so that a leaked or replayed token cannot be used to hijack an account or to redirect a different user's email change.

**Why this priority**: The verification token is the only thing standing between an initiator and a committed email change. Without strict lifecycle rules, leaked links and stale tokens become a credible attack surface. P2 because the underlying flow (US1) is what the user sees; this story is what makes the flow safe to operate.

**Independent Test**: Issue a confirmation token, then attempt to use it (a) twice, (b) after expiry, (c) after the user has initiated a newer change. Each MUST be rejected with a clear error, and no email change MUST be committed. Confirmation MUST succeed when the user clicks the link in a session that is different from (or absent compared to) the session that initiated the change, because the token is the sole authority for the confirm step.

**Acceptance Scenarios**:

1. **Given** an unused confirmation token, **When** the user confirms ownership before the token expires, **Then** the change proceeds and the token is marked consumed (pending row transitions through `confirmed` → `committed`).
2. **Given** a confirmation token that has already been consumed, **When** the same token is presented again, **Then** the platform rejects it and surfaces a clear "already used" error.
3. **Given** a confirmation token that has expired, **When** the user attempts to confirm, **Then** the platform rejects it and surfaces a clear "expired" error, optionally inviting the user to restart the change.
4. **Given** an outstanding pending change for a user, **When** the same user initiates a new email change, **Then** the previous token is invalidated (`superseded`) and only the new token is honored.
5. **Given** a confirmation link, **When** the user clicks it on a different device or in an incognito window (no Alkemio session), **Then** the confirmation MUST still commit the change — the token, not the session, is the authority for the confirm step.

---

### User Story 3 — Subject User Reads Their Own Pending Change (Priority: P2)

As a subject user, I want to see my own active pending email change in-app so that I can verify the state (waiting for confirmation, or in the abnormal `drift_detected` state) without consulting an administrator.

**Why this priority**: P2 because the confirmation message and the post-commit security-signal notification already deliver the actionable information to the user via mail. This query is the in-app surface for users who want to verify the state of an in-flight change or check whether something unusual has happened.

**Independent Test**: A user initiates a change via `meUserEmailChangeBegin` and queries `me.pendingEmailChange` — sees the pending row with `state: INITIATED`, `initiatorRole: SELF`, the proposed new email, issue timestamp, and expiry timestamp. After confirming, the query returns the COMMITTED state briefly during the in-flight commit window, then returns null once the pending row transitions to a non-active terminal state. If a fault injection forces the pending row into `drift_detected`, the query returns the row with `awaitingAdminReconciliation: true` and no per-side observed values or technical failure diagnostics.

**Acceptance Scenarios**:

1. **Given** a self-initiated pending change in state `initiated` or `confirmed`, **When** the subject user queries `me.pendingEmailChange`, **Then** the response includes the state, `initiatorRole: SELF`, the proposed new email, the issue timestamp, and the expiry timestamp.
2. **Given** no pending change for the calling user, **When** they query `me.pendingEmailChange`, **Then** the response is null.
3. **Given** a pending change exists for some other user, **When** the calling user queries `me.pendingEmailChange`, **Then** the response is null (the query is keyed to the caller; it MUST NOT return any other user's pending change).
4. **Given** a self-initiated pending change has reached the terminal `drift_detected` state within the past 30 days, **When** the subject queries `me.pendingEmailChange`, **Then** the response is returned with `awaitingAdminReconciliation: true` (a forensic indicator telling the subject to contact support), without exposing per-side observed email values, technical failure reasons, or other internal diagnostics — those remain visible only to platform admins via 097's audit query.
5. **Given** the pending change has reached any other terminal state (`committed`, `rolled_back`, `expired`, `superseded`), **When** the subject queries `me.pendingEmailChange`, **Then** the response is null (these terminal states are not surfaced by the me-query; the subject observes those outcomes via the confirmation message reply, the post-commit security-signal notification at the old address, or by attempting to log in).

---

### Edge Cases

- The user's session expires between clicking the confirmation link and the link being processed. Confirmation MUST still commit the change (the token, not the session, is the authority — FR-018a).
- The user initiates a change, then immediately initiates another change to a different address before confirming the first. The system MUST invalidate the prior pending token (transition to `superseded`) and accept only the most recent one.
- The user clicks the confirmation link in a different browser / device than where they initiated the change. The confirmation MUST succeed regardless of session continuity.
- The new email is identical (case-insensitive) to the current email. The platform MUST treat addresses case-insensitively for equality and conflict checks (per 097's FR-006); the rejection happens at initiation, before any pending row or token is created, with a `EMAIL_CHANGE_NO_CHANGE` error.
- The outbound mail provider hard-fails during initiation, after validation has passed. The just-persisted pending change MUST be rolled back (so no record remains), the confirmation token MUST be discarded (and treated as never issued), and the initiation MUST be audited with an `initiation_failed` outcome (per FR-019a below).
- Between initiation and confirmation, another user grabs the proposed new email. The confirmation MUST re-validate uniqueness (per FR-004a) and reject the confirmation with a `conflict` error before any side-write.
- An admin initiates a synchronous email change via 097's `adminUserEmailChange` while a self-initiated pending change exists for the same subject. The admin path commits synchronously and supersedes the pending row (transitions it to `superseded`); the subject's old token can no longer be confirmed. The next time the subject queries `me.pendingEmailChange`, the response is null. (Cross-flow supersession is symmetric: a self-initiation also supersedes any in-flight admin pending row IF one exists, though admin pending rows only exist during the brief in-mutation window since 097 commits synchronously.)
- The pending change exists for a user whose Alkemio account is subsequently deactivated or deleted before confirmation. The token MUST be rejected on confirmation (the subject lookup fails first) and the pending change is cleaned up by the standard retention purge.

## Out of Scope

- All foundational behaviour contracted in spec 097 (audit entity, two-side commit, retry, rollback, drift detection, drift-resolve admin mutation, validation pipeline at initiation, security signal, session invalidation, audit query). This spec MUST NOT duplicate or redefine those contracts; it inherits and extends them.
- Bulk self-service operations.
- A subject-user mutation to cancel a pending change. Allowing the token to expire (or initiating a new change that supersedes the prior one) remains the only user-side way to abandon a pending change.
- A `me`-shaped audit-history query for the calling user (subject-user audit visibility remains out of scope for this iteration; admins read via 097's `platformAdmin.userEmailChangeAuditEntries`).
- Localization of the confirmation message or the security signal. Both messages remain English-only per 097's FR-016a; this spec MUST NOT introduce locale resolution.
- Surfacing the initiating admin's identity to the subject user via `me.pendingEmailChange`. The 097 admin flow commits synchronously without a pending row, so the subject's me-query never observes an admin-initiated pending change. The post-commit security-signal at the old address (097's FR-016, role tag `platform admin`) is the subject's signal for admin-initiated changes.

## Requirements _(mandatory)_

### Functional Requirements

#### Verification flow — self-service initiation, token, confirmation

- **FR-001**: System MUST expose a server-side GraphQL mutation for a logged-in user to initiate a change to their own login email. The mutation MUST be placed under the `me`-shaped surface (per 097's FR-018 conventions), take a single `Input` object containing the proposed new email, persist a `email_change_pending` row in state `initiated`, issue a confirmation token, and dispatch a confirmation message to the proposed new address.
- **FR-001a**: The self-service initiation MUST be available for any Kratos identity regardless of credential type (password credential, OIDC link, or both). The `email` trait change is applied identically in all cases; OIDC link bookkeeping is not modified. OIDC-only users MUST NOT be rejected at initiation on the basis that they lack a Kratos password credential. (Mirrors 097's FR-002a for the admin path; both flows share the same Kratos extension method.)
- **FR-003**: System MUST require proof of ownership of the proposed new email before committing the change on either side. Proof is established by the user demonstrating control of the new mailbox via a confirmation message sent to that address.
- **FR-003a**: The confirmation message MUST contain a clickable link whose target carries an opaque single-use token. The link MUST target a client-web URL (the client application's deep link for confirming an email change), NOT a server-side HTTP endpoint; the client-web app reads the token from the URL and invokes the GraphQL confirm mutation. The server MUST NOT introduce a new HTTP route to consume the token directly; all confirmation logic remains behind the GraphQL surface. Confirmation MUST be reachable solely by following that link; the feature MUST NOT additionally emit a user-typeable code, and the confirm mutation MUST accept a single token string (no separate code-based code path).
- **FR-003b**: The confirmation message body MUST contain, in addition to the clickable link from FR-003a: (a) the initiator role tag (`self` — the only role this spec emits; admin-initiated messages do not exist because 097 commits synchronously without a confirmation message), (b) an explicit statement that the link is time-limited and consistent with the 1-hour TTL contracted in FR-007b, and (c) a recovery / disclaimer line instructing the recipient to ignore the message and contact support if the change was not expected. The message MUST NOT include: the confirmation token outside the link itself; the identity provider identity id; or any other internal identifier. The message MUST be rendered in English per 097's FR-016a; no per-user locale resolution is introduced.
- **FR-007**: System MUST issue confirmation tokens that are (a) short-lived, (b) single-use, (c) scoped to the specific user and the specific proposed new email, and (d) invalidated when a newer pending change is initiated for the same user.
- **FR-007a**: The confirmation token MUST be persisted as plaintext on the pending-change record (no separate hash column). Confirmation lookups compare the presented token against the stored plaintext value directly. The token's safety relies on (i) its short TTL (per FR-007(a) and the concrete value in FR-007b), (ii) its single-use semantics (FR-007(b)), (iii) the invalidation rule on supersession (FR-007(d)), (iv) database access controls applied to the pending-change record, and (v) its entropy floor (per FR-007c). Audit entries (inherited from 097's FR-014 / FR-014a) MUST NOT contain the token value.
- **FR-007b**: The confirmation token's TTL MUST be exactly 1 hour from its issue timestamp. Tokens presented after the 1-hour boundary MUST be rejected and MUST surface the `EMAIL_CHANGE_TOKEN_EXPIRED` error per 097's FR-015 error-code mapping (extended additively by this spec). The same 1-hour expiry MUST be the value materialized in the pending-change record's `expiry_at` field returned by FR-022.
- **FR-007c**: The confirmation token MUST be generated from a cryptographically secure random source and MUST carry at least 128 bits of entropy. The token's serialized form MUST be URL-safe (e.g., base64url or hex) so that it can be embedded as a query-string parameter in the client-web deep link defined in FR-003a without further encoding. The serialized form's character length is an implementation choice subject to the 128-bit floor. The token MUST NOT encode or derive from the subject user id, the proposed new email, the issue timestamp, or any other identifier — it is an opaque random value, and the binding to the (user, proposed new email) pair is established by the pending-change record, not by the token's internal structure.
- **FR-008**: System MUST consume the confirmation token atomically: a successful confirmation triggers the two-side commit (per 097's FR-009); a failed or rejected confirmation MUST NOT alter the login email on either side.
- **FR-018a**: The confirm-email-change mutation MUST be exposed as a top-level (root) GraphQL mutation, callable without an Alkemio session. The token presented in the mutation input is the sole authority for the confirmation; the resolver MUST NOT require, infer, or rely on any caller session for authorization. Authorization is enforced solely by the pending-change token lookup: a presented token that matches an active pending-change record proceeds to the FR-004a uniqueness re-check and 097's two-side commit path; any other presentation (no match, expired, already consumed, or superseded per FR-007(d)) is rejected with the corresponding error code surface and audited per 097's FR-014.

#### Confirm-time validation and atomic initiation

- **FR-004a**: System MUST re-validate the proposed new email's uniqueness at confirmation time, before any side-write. The re-check applies the same scope as 097's FR-004 (Alkemio user records and identity provider identities) and the same case-insensitivity rules from 097's FR-006. If the proposed email is now in use by another Alkemio user or identity provider identity, the confirmation MUST be rejected with a `conflict` error, no side-write MUST occur on either side, and an audit entry with the `rejected_conflict` outcome MUST be written (subject to the non-leaky failure-reason rules of 097's FR-014). The pending-change record MUST NOT transition to `confirmed` or `committed` in this case; supersession by a new initiation (per FR-007(d) / FR-019) remains the user's path forward. This narrows the window in which 097's compensating-rollback path would otherwise be exercised for a benign uniqueness race between initiation and confirmation.
- **FR-019**: System MUST be idempotent on retry of the initiation step in the sense that re-submitting the same proposed new email while a pending change exists does not create duplicate tokens; it MUST refresh the pending change and replace the token (in line with FR-007(d)).
- **FR-019a**: Initiation MUST be atomic across "persist pending change" and "send confirmation message": if the outbound mail provider returns a hard failure after 097's FR-004 / FR-005 / FR-006 validation has passed, the just-persisted pending change MUST be rolled back so that no record remains, the confirmation token MUST be discarded (and treated as never issued), no audit entry of the `initiated` outcome MUST be retained on success — instead the initiation MUST be audited with an `initiation_failed` outcome describing the mail-send failure — and the initiator MUST receive a distinct error surface identifying the failure as a mail-delivery problem. The initiator MAY retry immediately; a retry is a fresh initiation, not a refresh under FR-019.

#### Pending-change state, retention, and authorization

- **FR-013** (self-service complement to 097's FR-013): The self-service initiation mutation MUST authorize the caller as the subject; a user MAY initiate a change only for themselves. The mutation takes no `userID` argument; the subject is always `currentUser.id`. Other actors MUST NOT be able to spoof the subject via input.
- **FR-020**: System MUST retain pending-change records for 30 days after they reach a terminal state (`committed`, `rolled_back`, `expired`, `superseded`, `drift_detected`) and MUST remove them after that window so that operational state does not grow without bound. The audit log inherited from 097 (FR-014a) is the system of record for longer-term investigation and is not bounded by this 30-day window.

#### Pending-change state lifecycle

- **FR-021** (self-service extension to 097's FR-021): The pending-change record introduced by this spec carries one of 7 lifecycle states: `initiated`, `confirmed`, `committed`, `rolled_back`, `expired`, `superseded`, `drift_detected`. The `committed` / `rolled_back` / `drift_detected` outcomes are equivalent to the corresponding audit-entry outcomes inherited from 097; `initiated` / `confirmed` / `expired` / `superseded` are pending-only lifecycle markers and their audit-entry mirrors are introduced additively by this spec.

#### Subject-user read query

- **FR-022**: System MUST expose a `me`-shaped GraphQL query that returns the calling user's active pending email change, if any, including the state (`initiated`, `confirmed`, or `drift_detected` within the 30-day FR-022a window), the initiator role (always `SELF` in this spec; admin-initiated changes have no pending row because 097 commits synchronously), the proposed new email, the issue timestamp, and the expiry timestamp. The query MUST NOT return any pending change belonging to another user, and MUST NOT expose the confirmation token. No mutation is provided for the subject user to cancel a pending change; allowing the token to expire (or initiating a new change that supersedes the prior one) is the only user-side way to abandon it.
- **FR-022a**: For the purposes of FR-022, "active" includes any pending change in state `initiated` or `confirmed`, AND any pending change in state `drift_detected` for which the 30-day retention window (FR-020) has not yet elapsed. When the returned record is in state `drift_detected`, the response MUST additionally include a boolean indicator that admin reconciliation is required (e.g., `awaitingAdminReconciliation: true`), so that the subject user can identify the abnormal state and contact support / a platform admin. The response in the `drift_detected` case MUST NOT expose the per-side observed email values, the underlying failure reason in technical detail, or any other internal diagnostic — those remain visible only via 097's audit query (FR-014b) under the `platformAdmin` surface. Other terminal states (`committed`, `rolled_back`, `expired`, `superseded`) MUST NOT be returned by FR-022; the subject user observes those outcomes via the confirmation message, the post-commit security-signal notification (097's FR-016), or by attempting to log in.

#### Cross-flow drift reconciliation (extension to 097's FR-009b)

- **FR-009b-EXT**: 097's `adminUserEmailChangeDriftResolve` mutation MUST be extended (additively, as part of this spec's implementation) to also transition the associated `email_change_pending` row (when one exists) to a non-active terminal state on successful resolution. The transition is: `drift_detected` → `committed` if `canonicalEmail = pending.new_email` (the admin chose to keep the change); `drift_detected` → `rolled_back` if `canonicalEmail = pending.old_email` (the admin chose to revert). The pending row is then subject to the standard FR-020 30-day retention purge. If no pending row is associated with the drift_detected audit entry (i.e., 097's admin-on-behalf synchronous flow), there is no pending-row transition to perform — 097's behaviour is unchanged. Importantly: the `drift_detected` and `drift_resolved` audit entries continue to be immutable forensic evidence (097's FR-009b / FR-014a are unchanged).

### Inherited Requirements (Reference Only — Owned by 097)

The following requirements from 097 govern this spec's runtime behaviour but are NOT redefined here:

- FR-002a (OIDC parity in the Kratos email-trait write — applies identically to the self-initiated path via FR-001a)
- FR-004 (initiation-time validation — same scope and rules)
- FR-005 (no-change rejection)
- FR-006 (case-insensitive equality)
- FR-009 (two-side commit with bounded retry — runs unchanged on confirmation in this flow)
- FR-009a (drift detection — runs unchanged when both forward and rollback fail)
- FR-009b (admin-driven drift reconciliation — see FR-009b-EXT above for the pending-row transition extension)
- FR-010 (in-place identity update)
- FR-011 (mark verified at commit)
- FR-012 (login behaviour post-commit)
- FR-014, FR-014a, FR-014b (audit entries — every self-initiated transition writes the same audit-entry surface as the admin path, with `initiator_role = self`)
- FR-015 (error code surface — extended additively by this spec with the token-lifecycle error codes; see FR-018a and contracts/graphql.md §6)
- FR-016, FR-016a, FR-016b (security-signal notification — `self` role tag is now also a valid emitted value)
- FR-017, FR-017a (session invalidation on commit)
- FR-018 (GraphQL conventions — FR-001's mutation follows them, placed under `me` per FR-018)

### Key Entities

This spec introduces **one** new entity (and additively extends the audit-outcome enum already owned by 097):

- **Pending Email Change** (`email_change_pending`): A short-lived record representing an in-flight self-initiated change request. Holds the subject user, the proposed new email, the issued confirmation token stored as plaintext (per FR-007a), the issue timestamp, the expiry timestamp (`issued_at + 1h` per FR-007b), the lifecycle state (one of the 7 values from FR-021), and the optional `confirmed_at` / `committed_at` / `failure_reason` columns. There is at most one active pending change per user (enforced by a partial unique index `WHERE state IN ('initiated', 'confirmed')`). The `initiator_role` column is fixed to `self` for all rows persisted by this spec (the column exists for forward-compatibility with the shared enum from 097). The row is purged 30 days after entering a terminal state (FR-020).

The existing `email_change_audit_entry` entity (introduced by 097) is reused without schema changes other than additive new values in the `email_change_audit_outcome` Postgres enum: `initiated`, `initiation_failed`, `confirmed`, `expired`, `superseded`, `rejected_used_token`, `rejected_expired_token`. The enum extension is non-breaking.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A user can complete a self-service email change end to end (initiate → click confirmation link → log in with new email) in a single sitting, with no support intervention, and without the platform losing any of the user's existing memberships, contributions, or history.
- **SC-002**: For every self-initiated email change attempt, the platform writes a sequence of audit entries — `initiated`, then either `confirmed` followed by 097's `committed`/`rolled_back`/`drift_detected`, or one of the rejection outcomes (`rejected_validation`, `rejected_conflict`, `initiation_failed`, `rejected_used_token`, `rejected_expired_token`, `superseded`) — all with `initiator_role = self`.
- **SC-003**: A subject user can read their own active pending change via `me.pendingEmailChange` and CANNOT query another user's pending change via this surface; the query is always keyed to the caller.
- **SC-004**: When a self-initiated pending change is in `drift_detected` (within the 30-day window), the subject's `me.pendingEmailChange` returns the record with `awaitingAdminReconciliation: true` and without per-side observed email values or technical failure diagnostics.
- **SC-005**: Confirmation tokens cannot be reused, accepted after expiry, or accepted after supersession; each adversarial presentation returns the matching typed error code and writes a matching `rejected_used_token` / `rejected_expired_token` / `EMAIL_CHANGE_TOKEN_INVALID` audit entry.
- **SC-006**: Confirmation succeeds regardless of the caller's session state (absent, expired, belonging to a different account) — the token is the sole authority per FR-018a.
- **SC-007**: When the outbound mail provider hard-fails during initiation after validation passes, the pending row is rolled back (no row remains), and the initiation is audited with `initiation_failed` outcome (per FR-019a).
- **SC-008**: When the proposed new email becomes taken between initiation and confirmation, the confirm-time uniqueness re-check (FR-004a) rejects the confirmation with `EMAIL_CHANGE_CONFLICT` and writes a `rejected_conflict` audit entry — no side-write occurs on either side.

All other measurable outcomes for the underlying two-side commit are owned by 097 (zero drift, audit coverage, fault-injected rollback, no side-writes on rejection, login post-commit, session invalidation, security signal). This spec inherits them by virtue of confirmation triggering 097's commit path.

## Clarifications

### Session 2026-05-18 (initial split)

- Q: Should the self-service self-initiation reuse the same `UserEmailChangeService` from 097 or be implemented in a parallel service? → A: Reuse. This spec adds `initiateSelf`, `confirm`, and `getActivePendingForSubject` methods to the same service. No parallel service.
- Q: For self-initiated changes, does the confirmation message body change relative to a (hypothetical) admin-initiated form? → A: Only `self` is ever emitted by this spec (097 has no confirmation message at all because it commits synchronously). The initiator role tag in the message body is always `self`. Contracted in FR-003b.
- Q: Does this spec extend 097's admin drift-resolve mutation? → A: Yes — FR-009b-EXT extends the mutation additively to also transition the associated `email_change_pending` row to a non-active terminal state (`committed` or `rolled_back` based on the admin-chosen canonical). The `drift_detected` and `drift_resolved` audit entries remain immutable forensic evidence per 097's contract.

### Session 2026-05-18 (smaller-MVP follow-up)

- Q: With 097 no longer carrying any verification machinery, does 098 need to introduce the `email_change_pending` entity natively? → A: Yes. The pending entity is the natural home of the multi-step verification lifecycle (`initiated → confirmed → committed`). 097 does not need a pending entity (it commits synchronously). This spec introduces it.
- Q: Does the subject's `me.pendingEmailChange` ever surface admin-initiated changes? → A: No. 097 commits synchronously without a pending row, so admin-initiated changes never exist in the pending entity. The query always returns `initiatorRole: SELF` (when not null). No `initiatorAdmin` field is introduced (the prior unified-spec FR-022 admin-disclosure becomes moot).
- Q: What if an admin invokes 097's `adminUserEmailChange` while a 098 self-initiated pending change is in flight? → A: Cross-flow supersession applies — the admin's synchronous commit invalidates (transitions to `superseded`) the in-flight self-initiated pending row. The subject's token can no longer be confirmed. The next `me.pendingEmailChange` returns null.

## Assumptions

- Spec 097 has landed (audit entity, two-side commit, drift handling, security signal, session invalidation, validation pipeline) before this spec's implementation can be merged. The `email_change_initiator_role` Postgres enum already carries both `self` and `platform_admin` values upfront per 097's data model — no enum migration is needed here for that enum; this spec extends only the `email_change_audit_outcome` enum (additively).
- The `UserEmailChangeModule` (097) is exported in a way that allows this spec's `me`-shape module to import it and call `UserEmailChangeService.initiateSelf` and `UserEmailChangeService.getActivePendingForSubject` (added by this spec). The `userEmailChangeConfirm` resolver lives in a new root-mutation surface that also imports the module.
- The token's lifetime is contracted at 1 hour from issue timestamp per FR-007b. Changing it is a spec-level decision.
- Email comparison for equality and uniqueness is case-insensitive on the local part as well as the domain (inherited from 097's FR-006).
- "Atomic in effect" does not require a distributed transaction (inherited from 097's compensating-action approach).
- Rate limiting for the initiation endpoint is provided by the existing edge infrastructure (Oathkeeper / Kratos / upstream throttling); this feature itself does not introduce per-user or per-(user, proposed-email) application-level counters or cooldowns.
- The post-commit security-signal notification at the old address (097's FR-016) and the session-invalidation policy on commit (097's FR-017) apply unchanged to self-initiated commits. The notification carries `initiator_role: self` for these cases.

## Dependencies

- **Spec 097** (foundational; MUST be merged first).
- The identity provider's admin API supports replacing an identity's `email` trait and the verified-address bookkeeping (inherited from 097's dependency).
- An outbound mail channel supports both the confirmation message (introduced by this spec) and the post-commit security signal (inherited from 097).
- A new typed config key `endpoints.client_web: string` MUST be available in `AlkemioConfig` for the confirmation deep-link host. (097 does not need this key because it sends no confirmation message; this spec introduces it.)
- The existing `NotificationExternalAdapter` is the canonical entry point for both notifications; this spec adds a new `NotificationEvent` value (`USER_EMAIL_CHANGE_CONFIRMATION`) and its payload type.
