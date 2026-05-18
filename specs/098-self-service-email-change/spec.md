# Feature Specification: Self-Service Email Change

**Feature Branch**: `098-self-service-email-change`
**Created**: 2026-05-18
**Status**: Draft
**Input**: Split from `097-change-user-email` on 2026-05-18 — adds the user-initiated path on top of the admin-on-behalf foundation contracted there.

**Related Issues**:

- alkem-io/server#6064 — Allow changing a user's login email while preserving their Alkemio profile (motivating issue, shared with 097)

**Related Specs**:

- **097 — Platform Admin Change User Login Email With Ownership Verification** (foundational dependency). Owns: the `email_change_pending` and `email_change_audit_entry` entities; the state machine (7 states including `drift_detected`); the token lifecycle utilities and ≥128-bit entropy contract; the two-side commit with bounded synchronous retry and compensating rollback; the drift-detection path and admin-only reconciliation mutation; the validation pipeline (format / no-change / conflict / confirm-time re-check); the audit table with indefinite retention; the 30-day pending-change retention; the security-signal notification to the old address; the session-invalidation on commit; the `userEmailChangeConfirm` root mutation (session-less, token = sole authority); the `email_change_initiator_role` Postgres enum (which already carries both `self` and `platform_admin` values upfront). This spec adds **only** the self-service initiation surface and the subject-user read query.

## User Scenarios & Testing _(mandatory)_

### User Story 1 — User Changes Their Own Login Email (Priority: P1)

As a registered Alkemio user, I want to change the email address I use to log in so that I can move authentication to a new mailbox (e.g., after a job change or provider migration) without losing my profile, memberships, contributions, or history.

**Why this priority**: This is the user-facing self-service capability the issue exists to deliver. The admin-on-behalf path (097) handles the support case where the user has already lost mailbox access; this story handles the proactive case where the user still has access to both the old and new mailboxes.

**Independent Test**: A logged-in user requests an email change to a new address, confirms ownership via the email sent to that new address, and is then able to log in only with the new address — the old address no longer authenticates. The user's profile id, memberships, and content remain unchanged. The user can additionally observe their pending change (and, after a partial-failure rollback, observe its terminal state for 30 days) via the `me.pendingEmailChange` query introduced here.

**Acceptance Scenarios**:

1. **Given** a logged-in user with a valid login email, **When** the user requests to change their email to a new, unused address, **Then** the platform sends a confirmation message to the new address and records a pending change without yet altering the login email. The pending change is also visible via the user's own `me.pendingEmailChange` query.
2. **Given** a pending email change with an unexpired confirmation token, **When** the user proves ownership of the new address (clicks the confirmation link in the message sent to that address), **Then** the login email is updated in both the Alkemio user record and the identity provider, the user's profile id is unchanged, and the pending change is marked complete (handled by the foundation in 097).
3. **Given** the user has completed the change, **When** they attempt to log in with the new address, **Then** authentication succeeds; **When** they attempt to log in with the old address, **Then** authentication is rejected.
4. **Given** the user has completed the change, **When** they view their profile, **Then** all memberships, contributions, and historical references are intact and continue to reference the same user identity.

---

### User Story 2 — Subject User Sees Admin-Initiated Pending Change (Priority: P2)

As a subject user, I want to see when a platform administrator has initiated an email change on my behalf so that I can identify which administrator acted, verify its legitimacy, and decide whether to follow the confirmation link or contact support to abandon the change.

**Why this priority**: P2 because the admin-on-behalf flow (097) already delivers the confirmation message to the new mailbox; the subject can act on the change without ever consulting an in-app surface. This query adds in-app visibility and admin-identity disclosure for cases where the new mailbox is on a different device or the subject wants to verify legitimacy before clicking. The post-commit security-signal at the old address (097's FR-016) is the separate trust signal for completion.

**Independent Test**: A platform admin initiates a change for a user via 097's `adminUserEmailChangeBegin`. The subject user queries `me.pendingEmailChange` and sees `initiatorRole: PLATFORM_ADMIN` together with a minimal admin profile summary (`{ id, displayName }`) identifying the acting admin. The subject's response MUST NOT contain the admin's email or any other PII beyond `id` and `displayName`. The subject MUST NOT be able to view another user's pending change.

**Acceptance Scenarios**:

1. **Given** an admin-initiated pending change for a user, **When** the subject user queries `me.pendingEmailChange`, **Then** the response includes `initiatorRole: PLATFORM_ADMIN` and a `initiatorAdmin: { id, displayName }` profile summary identifying the acting admin.
2. **Given** a self-initiated pending change, **When** the subject user queries `me.pendingEmailChange`, **Then** the response includes `initiatorRole: SELF` and **no** `initiatorAdmin` field (the caller already knows their own identity).
3. **Given** no pending change for the calling user, **When** they query `me.pendingEmailChange`, **Then** the response is null.
4. **Given** a pending change exists for some other user, **When** the calling user queries `me.pendingEmailChange`, **Then** the response is null (the query is keyed to the caller; it MUST NOT return any other user's pending change).
5. **Given** a pending change has reached the terminal `drift_detected` state within the past 30 days, **When** the subject queries `me.pendingEmailChange`, **Then** the response is returned with `awaitingAdminReconciliation: true` (a forensic indicator telling the subject to contact support), without exposing per-side observed email values, technical failure reasons, or other internal diagnostics — those remain visible only to platform admins via 097's audit query.

---

### Edge Cases

- The user's session expires between clicking the confirmation link and the link being processed. Confirmation MUST still commit the change (the token, not the session, is the authority — contracted in 097's FR-018a).
- The user initiates a change, then immediately initiates another change to a different address before confirming the first. The system MUST invalidate the prior pending token and accept only the most recent one (contracted in 097's FR-007(d) / FR-019).
- The user clicks the confirmation link in a different browser / device than where they initiated the change. The confirmation MUST succeed regardless of session continuity (097's FR-018a).
- An admin-initiated change is in flight for the user when the user attempts to initiate their own change. The new self-initiation supersedes the admin's pending change (097's supersession rule applies uniformly regardless of who initiated the prior pending change).

## Out of Scope

- All foundational behaviour contracted in spec 097 (entities, two-side commit, token lifecycle, validation, audit, retention, rollback, drift, security signal, session invalidation, the root confirm mutation). This spec MUST NOT duplicate or redefine any of those contracts.
- Bulk self-service operations.
- A subject-user mutation to cancel a pending change. Allowing the token to expire (or initiating a new change that supersedes the prior one) remains the only user-side way to abandon a pending change.
- A `me`-shaped audit-history query for the calling user (subject-user audit visibility remains out of scope for this iteration; admins read via 097's `platformAdmin.userEmailChangeAuditEntries`).

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST expose a server-side capability for a logged-in user to initiate a change to their own login email. The mutation MUST be placed under the `me`-shaped surface, take a single `Input` object containing the proposed new email, and delegate to the foundational state machine (097's `UserEmailChangeService.initiateSelf`) for validation, persistence, token issuance, and confirmation-mail dispatch. The mutation MUST follow 097's FR-018 GraphQL conventions and inherit the same validation and atomicity guarantees (097's FR-004, FR-005, FR-006, FR-019, FR-019a).
- **FR-001a**: The self-service initiation MUST be available for any Kratos identity regardless of credential type (password credential, OIDC link, or both). The `email` trait change is applied identically in all cases; OIDC link bookkeeping is not modified. OIDC-only users MUST NOT be rejected at initiation on the basis that they lack a Kratos password credential. (Mirrors 097's FR-002a contract for the admin path; both flows share the same Kratos extension method.)
- **FR-001b**: The confirmation message body for a self-initiated change MUST carry the initiator role tag `self` per 097's FR-003b — the role tag is the only initiator information disclosed in the message body. All other content rules from 097's FR-003a and FR-003b apply unchanged (clickable link only, time-limited statement, recovery instructions, no token outside the link, no internal identifiers, English-only per 097's FR-016a). The post-commit security-signal notification at the old address (097's FR-016) likewise carries the `self` role tag for self-initiated changes.
- **FR-022**: System MUST expose a `me`-shaped GraphQL query that returns the calling user's active pending email change, if any, including the state (`initiated`, `confirmed`, or `drift_detected` within the 30-day FR-022a window — see below), the initiator role (`self` vs `platform admin`), the proposed new email, the issue timestamp, and the expiry timestamp. When the initiator role is `platform admin`, the response MUST additionally include a minimal admin profile summary consisting of the admin's user id and display name, so that the subject user can identify which administrator initiated the change and verify its legitimacy. The admin's email address and any other admin PII (contact details, roles beyond the profile summary, etc.) MUST NOT be exposed by this query. When the initiator role is `self`, no separate initiator profile is included (the caller already knows their own identity). The query MUST NOT return any pending change belonging to another user, and MUST NOT expose the confirmation token. No mutation is provided for the subject user to cancel a pending change; allowing the token to expire (or initiating a new change that supersedes the prior one) is the only user-side way to abandon it. No proactive notification is sent to the subject user when an admin-initiated change is created; they are expected to learn of it through the confirmation message at the new address, through this query, or post-commit through the security-signal notification at the old address (097's FR-016). The admin-identity disclosure introduced here applies ONLY to this query; the post-commit security-signal notification (097's FR-016) remains role-only by design and is not modified.
- **FR-022a**: For the purposes of FR-022, "active" includes any pending change in state `initiated` or `confirmed`, AND any pending change in state `drift_detected` (terminal per 097's FR-009a) for which the 30-day retention window (097's FR-020) has not yet elapsed. When the returned record is in state `drift_detected`, the response MUST additionally include a boolean indicator that admin reconciliation is required (e.g., `awaitingAdminReconciliation: true`), so that the subject user can identify the abnormal state and contact support / a platform admin. The response in the `drift_detected` case MUST NOT expose the per-side observed email values, the underlying failure reason in technical detail, or any other internal diagnostic — those remain visible only via the audit query (097's FR-014b) under the `platformAdmin` surface. Other terminal states (`committed`, `rolled_back`, `expired`, `superseded`) MUST NOT be returned by FR-022; the subject user observes those outcomes via the confirmation message, the post-commit security-signal notification (097's FR-016), or by attempting to log in.

### Inherited Requirements (Reference Only — Owned by 097)

The following requirements from 097 govern this spec's behaviour but are NOT redefined here. This spec's runtime behaviour MUST conform to them:

- FR-003, FR-003a, FR-003b (confirmation message contract — including the `self` role tag emission required by this spec's FR-001b)
- FR-004, FR-004a, FR-005, FR-006 (validation pipeline)
- FR-007 family (token attributes, plaintext storage, 1-hour TTL, ≥128-bit entropy, URL-safe serialisation)
- FR-008 (atomic token consumption)
- FR-009, FR-009a, FR-009b (two-side commit, drift detection, admin-driven drift resolution — the subject user's `me.pendingEmailChange` query MUST surface `awaitingAdminReconciliation: true` when the change is in `drift_detected`, per FR-022a, but the resolution mechanism remains admin-only)
- FR-010, FR-011, FR-012 (in-place identity update, marked verified, new-email login succeeds / old-email login rejected)
- FR-013 (authorization — note the self-service complement: a user MAY initiate a change only for themselves; this spec contracts the authorization rule for the self-service path)
- FR-014, FR-014a, FR-014b (audit writes and admin-only audit query — every self-initiated transition writes the same audit entries as the admin path)
- FR-015 (error code surface)
- FR-016, FR-016a, FR-016b (security-signal notification — `self` role tag is now also a valid emitted value)
- FR-017, FR-017a (session invalidation on commit)
- FR-018a (root `userEmailChangeConfirm` mutation — used unchanged by this flow)
- FR-019, FR-019a (idempotent re-initiation; atomic initiation against mail-send failure)
- FR-020 (30-day pending-change retention)
- FR-021 (admin-only status query — unchanged; this spec does NOT extend it)

### Key Entities

This spec introduces **no new entities**. It writes to and reads from the entities introduced in 097:

- `email_change_pending` — this spec writes rows with `initiator_role = 'self'` and `initiator_user_id = subject_user_id`. The Postgres enum `email_change_initiator_role` already carries the `self` value upfront (per 097's data model), so no enum migration is needed.
- `email_change_audit_entry` — every self-initiated transition writes the same audit entries as the admin path, with `initiator_role = 'self'`.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A user can complete a self-service email change end to end (initiate → confirm → log in with new email) in a single sitting, with no support intervention, and without the platform losing any of the user's existing memberships, contributions, or history.
- **SC-002**: For every self-initiated email change attempt, the platform writes an audit entry with `initiator_role = 'self'` (subject to the same anti-enumeration rules as the admin path).
- **SC-003**: A subject user can read their own active pending change via `me.pendingEmailChange` and, when admin-initiated, can identify the acting admin by `{id, displayName}` — and CANNOT obtain the admin's email or any other PII via this query.
- **SC-004**: A subject user CANNOT query another user's pending change via `me.pendingEmailChange`; the query is always keyed to the caller.
- **SC-005**: When a pending change is in `drift_detected` (within the 30-day window), the subject's `me.pendingEmailChange` returns the record with `awaitingAdminReconciliation: true` and without per-side observed email values or technical failure diagnostics.

All other measurable outcomes for the underlying flow are owned by 097 (SC-001 admin happy path, SC-002 zero divergence, SC-003 audit coverage, SC-004 fault-injected rollback, SC-005 token adversarial, SC-006 zero-mail-on-rejection, SC-007 login post-commit, SC-008 sessions invalidated, SC-009 single security-signal). This spec inherits them by virtue of using 097's foundation.

## Clarifications

### Session 2026-05-18

- Q: Should the self-service self-initiation reuse the same `UserEmailChangeService` from 097 or be implemented in a parallel service? → A: Reuse. Spec 097 contracts `UserEmailChangeService` as the single state-machine owner; this spec adds an `initiateSelf` method to the same service and a corresponding `me`-shape resolver. No parallel service.
- Q: When an admin-initiated change has been initiated for the user and the subject user then initiates their own change for the same subject, what happens? → A: Standard supersession (097's FR-007(d) / FR-019). The admin's pending row transitions to `SUPERSEDED` and only the new self-initiated token is honoured. No special-case logic for cross-initiator supersession.
- Q: Does this spec extend the admin status query (097's FR-021) or the admin audit query (097's FR-014b)? → A: No. Both remain admin-only and unchanged. Subject-user visibility is exclusively through `me.pendingEmailChange` (FR-022).
- Q: For self-initiated changes, does the confirmation message body change relative to the admin-initiated form? → A: Only the initiator role tag value changes (from `platform admin` to `self`). All other content rules from 097's FR-003a / FR-003b apply unchanged. Contracted in FR-001b.

## Assumptions

- Spec 097 has landed (entities, state machine, audit table, root confirm mutation, security signal, session invalidation, validation pipeline, retention purge) before this spec's implementation can be merged. The `email_change_initiator_role` Postgres enum already carries both `self` and `platform_admin` values upfront per 097's data model — no enum migration is needed.
- The `UserEmailChangeModule` (097) is exported in a way that allows this spec's `me`-shape module to import it and call `UserEmailChangeService.initiateSelf` and `UserEmailChangeService.getActivePendingForSubject` (added by this spec).
- All other assumptions from 097 apply (Kratos admin API, outbound mail capability, authorization model, case-insensitivity rules, edge-infrastructure rate limiting, atomic-in-effect via compensating actions).

## Dependencies

- **Spec 097** (foundational; MUST be merged first).
- Same Kratos and mail-channel dependencies as 097.
