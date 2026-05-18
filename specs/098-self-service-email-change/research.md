# Phase 0 — Research Decisions

**Feature**: 098-self-service-email-change
**Date**: 2026-05-18
**Foundational dependency**: `097-change-user-email/research.md` (research decisions for the audit foundation, two-side commit, retry, masking, etc.)

This document records the **technical research decisions** specific to the verification machinery introduced by this spec. Decisions inherited from 097 (Kratos `updateIdentity`, session-invalidation via `disableIdentitySessions`, Kratos-first commit ordering, retry helper schedule, email masking, audit table choice) are NOT redefined here. Read 097's research.md alongside this document.

---

## R3 — Token generation: entropy source, encoding, length

**Decision**: Generate the confirmation token via Node's `crypto.randomBytes(32)` (256 bits — above the FR-007c 128-bit floor) and serialize with `.toString('base64url')` → 43 characters of URL-safe text. Stored on the pending-change row in a `varchar(64)` column (gives headroom if the entropy floor is raised in future). The token is opaque and carries no encoded information about user, email, or timestamps (per FR-007c).

**Rationale**:
- `randomBytes` is the standard cryptographically-secure source in Node and is the same primitive used elsewhere in the codebase for opaque identifiers.
- 256 bits is twice the spec floor — the FR-007c clarification explicitly allows raising the entropy without a spec change. The marginal cost is 21 extra characters in the URL; the gain is negligible birthday-collision risk and a comfortable margin if the spec floor moves up.
- `base64url` is URL-safe by construction (no `+`, `/`, `=`) so it embeds in the client-web deep link's `?token=...` query parameter without further encoding (FR-003a, FR-007c).

**Alternatives considered**:
- `hex` encoding: rejected (longer for the same entropy — 64 chars for 256 bits vs 43 chars base64url).
- `randomUUID()`: rejected (UUID v4 only carries ~122 bits of entropy in its random bits and has structural noise — version + variant nibbles — that an attacker can exploit; below the 128-bit floor in spirit even if technically close).

---

## R6 — Confirmation `me` query: how does the subject user see pending state?

**Decision**: The `me.pendingEmailChange` field (FR-022) requires the standard authenticated session (the user is reading their own pending change). The query resolver MUST always use `currentUser.id` as the subject; there is no `userID` argument. The *confirmation mutation* (`userEmailChangeConfirm`) is the root-level, session-less mutation per FR-018a — it takes only the token and resolves the pending change purely by token lookup.

**Rationale**:
- These are two distinct paths with distinct authorization rules. FR-018a is specifically about the confirm mutation (token = sole authority — required by the edge-case contract that confirmation succeeds regardless of session state). FR-022 is the read-side query, which the spec explicitly places under the `me` shape (i.e., requires a session).
- The token never appears in either response shape. The audit query (097's FR-014b) and the masked-address security-signal notification (097's FR-016) are the only post-commit channels.
- Since 097 commits admin changes synchronously without a pending row, the me-query never observes an admin-initiated pending change. The query response always carries `initiatorRole: SELF` when not null. No `initiatorAdmin` field is introduced.

**Alternatives considered**:
- Making `pendingEmailChange` also session-less and lookable-by-token: rejected (FR-022 is explicit; opening this would create an exfiltration surface where any token holder learns the proposed new email).

---

## R7 — Email uniqueness re-check at confirm time

**Decision**: Implement uniqueness via a database query inside the SAME transaction that consumes the token and prepares the side-write. Query: `SELECT 1 FROM user WHERE LOWER(email) = LOWER($1) AND id != $userID LIMIT 1`. Combine with a Kratos lookup `kratosIdentityClient.listIdentities({ credentialsIdentifier: newEmail })` (case-insensitive on Kratos's side per `@ory/kratos-client` default). Both must return empty for the confirm to proceed.

**Rationale**:
- Re-checking uniqueness within the same transaction that flips the pending-change state from `initiated` → `confirmed` closes the FR-004a race window. If a benign uniqueness conflict arose between initiation and confirm, this catches it before any side-write.
- The Kratos check is independent of any Alkemio user — there can be a Kratos identity for an email that has no Alkemio user (e.g., mid-registration) and we still must reject.
- Case-insensitive comparison via `LOWER()` matches 097's FR-006. The `email` column on `user` is already a single canonical form preserved as-supplied, with `unique: true` enforced at the DB level — but the unique constraint is by binary equality, so the explicit `LOWER()` is necessary to catch case variants.

**Alternatives considered**:
- Relying solely on the DB unique constraint to fail at commit: rejected (the failure surface is a Postgres unique-violation exception that is harder to translate to a clean `conflict` error; and the Kratos side has no equivalent constraint).
- Distributed lock / advisory lock: rejected (we already serialize per user via `WHERE state = 'initiated'` on the pending row; further locking is overkill).

---

## R8 — Confirmation message: which adapter, what payload shape?

**Decision**: Add ONE new entry to `NotificationEvent` — `USER_EMAIL_CHANGE_CONFIRMATION` — and publish it via the existing `NotificationExternalAdapter.sendExternalNotifications(event, payload)` pattern. The payload is a new typed class added to `@alkemio/notifications-lib` (extension; backward-compatible).

Confirmation payload fields (sent to the **proposed new** address):
- `recipientEmail` (the new address)
- `confirmationLink` (full URL: `${endpoints.client_web}/identity/email-change/confirm?token=${token}`)
- `initiatorRole` (`SELF` — the only value emitted by this spec)
- `expiryISO8601` (rendered timestamp for the message body)

**Rationale**:
- The existing `NotificationExternalAdapter` is the canonical entry point — already integrates with `alkemio-notifications` over RabbitMQ, already supports the typed-payload pattern. Reusing it preserves Constitution Principle 10 (Simplicity) and Principle 4 (Explicit Data & Event Flow).
- A separate event from 097's `USER_EMAIL_CHANGE_SECURITY_SIGNAL` keeps the notifications-service rendering simple and the audit / debug surfaces clean (different recipients, different templates, different trust signals).

**Alternatives considered**:
- Inline SMTP / direct `nodemailer`: rejected (bypasses the established mail abstraction; introduces credential handling in this module).
- Single combined event with 097's security signal: rejected (different recipients, different templates).

**Open dependency note**: This requires a coordinated bump of `@alkemio/notifications-lib` and the corresponding template rendering in the `alkemio-notifications` service. Tracked in tasks.md.

---

## R9 — `client-web` deep-link URL config

**Decision**: Add a new typed config key `endpoints.client_web: string` to `AlkemioConfig` (in `src/types/alkemio.config.ts`), populated by the `config.yml` chain. The confirmation deep link is built as `${endpoints.client_web}/identity/email-change/confirm?token=${token}`. The path segment is contracted in this plan, not configurable per environment.

**Rationale**:
- The existing config already has `hosting.endpoint_cluster` for backend URLs, but no externalized client-web URL. Confirmation links are the first server-side context that needs to point *into* client-web (097 has no confirmation message at all), so this is a justified addition.
- Contracting the path (`/identity/email-change/confirm`) in spec/plan rather than config keeps the server and client-web aligned by versioned contract rather than by deploy-time accident.

**Alternatives considered**:
- Putting the entire URL in config (including the path): rejected (couples server config to client-web routing).
- Deriving from `hosting.endpoint_cluster`: rejected (these are different hosts in every non-trivial deployment).

---

## R10 — Audit-outcome enum extension

**Decision**: Extend the `email_change_audit_outcome` Postgres enum (created by 097 with 11 values) with 7 additive values: `initiated`, `initiation_failed`, `confirmed`, `expired`, `superseded`, `rejected_used_token`, `rejected_expired_token`. Use 7 individual `ALTER TYPE ... ADD VALUE IF NOT EXISTS '...'` statements in the migration. The extension is non-breaking. After this migration the enum carries 18 values total.

**Rationale**:
- 097's audit-outcome enum captures the outcomes of the admin synchronous flow. The verification flow introduces additional lifecycle markers (`initiated`, `confirmed`, `expired`, `superseded`) and additional failure modes (`initiation_failed`, `rejected_used_token`, `rejected_expired_token`). These are naturally orthogonal additions.
- Postgres requires one `ADD VALUE` per statement; `IF NOT EXISTS` makes the migration idempotent under re-runs.

**Alternatives considered**:
- Use a separate audit table for verification-flow outcomes: rejected (would split the audit query surface — 097's `userEmailChangeAuditEntries` would need to UNION two tables).
- Use a varchar `outcome` column instead of enum: rejected (loses write-time validation and uses more storage).

---

## R12 — Pending-change retention (30 days post-terminal) — when does the purge run?

**Decision**: The 30-day retention purge (FR-020) runs as a daily idempotent cleanup at the existing maintenance scheduling tier (likely a NestJS `@Cron` job under `src/services/infrastructure/scheduled/` or equivalent — to be confirmed at implementation time). Audit entries (097's FR-014a) are NOT purged — they are retained indefinitely.

**Rationale**:
- A daily purge is sufficient: the cutoff is 30 days, not 30 minutes, so cadence is not load-bearing.
- The purge is independent of the email-change flow itself; failing-purge does not affect commit correctness, only operational hygiene.

**Alternatives considered**:
- Purge on every state transition: rejected (couples a hot write path to a cold sweep; performance penalty for no win).
- No purge (let admins issue DELETEs): rejected (FR-020 mandates the 30-day window).

---

## R13 — Testing strategy

**Decision**:
- **Unit (Vitest)**:
  - `initiateSelf` happy path + supersession of prior pending row + FR-019a atomic-init rollback on mail-send failure.
  - `confirm` token-lifecycle guards (every adversarial branch: not-found, used, expired, superseded, drift_detected, wrong-user-with-different-session — last MUST succeed per FR-018a).
  - `confirm` FR-004a uniqueness re-check rejection (Alkemio-side hit, Kratos-side hit, both).
  - `confirm` happy path threading through 097's two-side commit (mocked retry-success-first).
  - `getActivePendingForSubject` mapping for every observable state: INITIATED (returns row), CONFIRMED (returns row), COMMITTED (returns null — not in observable set), ROLLED_BACK / EXPIRED / SUPERSEDED (returns null), DRIFT_DETECTED within window (returns row with `awaitingAdminReconciliation: true`), DRIFT_DETECTED past window (returns null).
  - Token utility (entropy, encoding, determinism — never encodes user/email/timestamp inputs).
  - The me-shape resolver and the root confirm resolver authorization shapes (current-user-binding for me; session-less for root).
  - The extended drift-resolve method's pending-row transition for both canonical choices.
- **Integration (`*.it-spec.ts`)**:
  - Self-service end-to-end: initiate → MailSlurper assertion (role tag `self`) → confirm session-lessly → assert two-side commit + sessions invalidated + security-signal at old address (via 097's existing surface).
  - Token adversarial cases: reuse (`EMAIL_CHANGE_TOKEN_USED`), expiry (`EMAIL_CHANGE_TOKEN_EXPIRED` even after lazy sweep), supersession (`EMAIL_CHANGE_TOKEN_INVALID`), wrong-user-session-confirm (succeeds).
  - FR-004a confirm-time conflict: between initiate and confirm, mutate the `user` table to give another user the proposed address → confirm fails with `EMAIL_CHANGE_CONFLICT` → no side-write → `rejected_conflict` audit entry.
  - FR-019a atomic init: mock the NotificationAdapter to fail → assert pending row is rolled back (no row remains) + audit `initiation_failed`.
  - Drift-resolve extension: induce drift on a 098 pending row → invoke 097's drift-resolve mutation with canonical = new_email → assert pending row transitions to `committed` (not stuck in `drift_detected`).

**Rationale**: Risk-based testing (Constitution Principle 6). The state machine, token lifecycle, and FR-004a/FR-019a are high signal — bugs here directly attack the verification guarantee. Resolver-DTO pass-throughs are low signal and covered transitively by integration.

---

## Summary

| ID | Topic | Decision (one-liner) |
| --- | --- | --- |
| R3 | Token generation | `crypto.randomBytes(32).toString('base64url')` → 256 bits, 43 chars |
| R6 | Confirm vs subject-user read | Confirm is session-less (token authority); me-query requires session and is keyed to caller |
| R7 | Confirm-time uniqueness re-check | DB `LOWER()` query + Kratos `listIdentities`, same scope as 097's FR-004 |
| R8 | Confirmation mail event | New `USER_EMAIL_CHANGE_CONFIRMATION` event on the existing NotificationExternalAdapter |
| R9 | client-web URL | New `endpoints.client_web` config key; contracted path `/identity/email-change/confirm?token=...` |
| R10 | Audit-outcome enum extension | 7 additive `ADD VALUE` statements; non-breaking |
| R12 | Retention purge | Daily idempotent cleanup; audit entries never purged |
| R13 | Test strategy | Unit for service + utils + resolver auth; integration for end-to-end, token adversarial, FR-004a, FR-019a, drift-resolve extension |

All NEEDS CLARIFICATION items from the Technical Context are resolved by spec.md §Clarifications. No open research items remain.
