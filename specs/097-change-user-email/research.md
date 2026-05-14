# Phase 0 — Research Decisions

**Feature**: 097-change-user-email
**Date**: 2026-05-13

Spec.md §Clarifications already resolves 28 ambiguities by direct contract. This document only records the **technical research decisions** that bridge those clarifications to concrete API and pattern choices. Each decision lists the alternatives that were considered and the rationale for the chosen path.

---

## R1 — Kratos: which admin API call replaces the `email` trait?

**Decision**: Use `kratosIdentityClient.updateIdentity({ id, updateIdentityBody })` with a full traits payload (new `email` plus the preserved `firstName` / `lastName` / etc.). The call MUST also send a fresh `verifiable_addresses` entry for the new email with `verified: true` and `via: 'email'` so the user is not re-prompted to verify (FR-011).

**Rationale**:
- `updateIdentity` is the documented Kratos admin endpoint for in-place identity trait + verifiable-address replacement (`PUT /admin/identities/{id}`). It accepts both `traits` and `verifiable_addresses` in a single atomic write, which matches FR-010 ("same identity id") and FR-011 ("marked verified at commit").
- `patchIdentity` (RFC 6902 JSON Patch) is available on the same client and is already used in `kratos.service.ts:349` for narrow field updates. It does NOT atomically guarantee that an out-of-sync `verifiable_addresses` array is reconciled with the new trait — applying a single `replace /traits/email` op leaves the old verifiable_address intact (marked verified) and the new one absent, which would cause Kratos to prompt the user to verify the new address on next login. Working around this with two patch operations (`/traits/email` and `/verifiable_addresses/*`) re-introduces non-atomicity on the Kratos side.

**Alternatives considered**:
- `patchIdentity` with multiple ops: rejected (non-atomic across array fields, harder to reason about retry idempotency).
- A two-step `recoveryFlow` + manual verification: rejected (FR-011 forbids re-verifying; also out of scope per the issue).

---

## R2 — Kratos: how to invalidate every session for an identity on commit?

**Decision**: Use `kratosIdentityClient.disableIdentitySessions({ id })`. The single call disables ALL active sessions for the identity in one shot.

**Rationale**:
- This satisfies FR-017 ("invalidate every existing session for that user on commit, regardless of which session initiated the change") with one round-trip — the bounded retry budget of FR-017a (2–3 attempts, ~5–10 s) is therefore trivially honored by a simple `for` loop with backoff around the single call.
- The `listIdentitySessions` → loop-`disableSession` alternative is already partially present in the codebase (`kratos.service.ts:624`) for diagnostic use; it would require N round-trips and adds a window during which new sessions could appear between the list and the disable.

**Alternatives considered**:
- Enumerate-and-disable per-session: rejected (more network calls, weaker atomicity, no benefit since we want to invalidate everything anyway).

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

## R4 — Commit ordering: write Alkemio first or Kratos first?

**Decision**: Write Kratos first, then Alkemio. On Kratos failure (after retry budget), no Alkemio change has happened — no compensation needed. On Alkemio failure (after retry budget), compensate by reverting the Kratos identity (re-apply the old `email` trait + old verifiable-address bookkeeping) within the same FR-009a retry budget.

**Rationale**:
- Kratos is the authority for "what email can log in". Even if Alkemio is updated first, a login attempt would still hit Kratos and fail until Kratos is updated — so reaching a half-committed `Alkemio=new, Kratos=old` state leaves the user inaccessible, while `Alkemio=old, Kratos=new` allows the user to log in but find their profile email out of sync (potentially even more confusing). Neither half-state is acceptable; we want the rollback path to be cheap and idempotent. Reverting Kratos (idempotent `updateIdentity` back to old trait) is straightforward.
- The reverse ordering — Alkemio first — would require us to revert a TypeORM write on failure of the external call. We can roll back the local transaction freely while it is still in-flight, but the Kratos call cannot happen inside the same transaction; the moment we commit the local txn we have lost the ability to atomic-roll-back. Doing Kratos first keeps the local txn open until both sides have succeeded.

**Alternatives considered**:
- Alkemio first: rejected per the above; loses the cheap local-transaction rollback.
- Two-phase commit / outbox pattern: rejected (FR-009 explicitly says "compensating-action approach is acceptable"; an outbox introduces async semantics that contradict "no background reconciliation").

---

## R5 — Compensating-rollback retry, and the `drift_detected` transition

**Decision**: Both the forward commit (Kratos update + Alkemio update) and the compensating rollback (Kratos revert) use the same retry helper: 3 attempts, exponential backoff with jitter (e.g., 500 ms → 1.5 s → 3.5 s, totalling ~5.5 s — within the FR-009 / FR-009a ~5–10 s budget). On exhaustion of the forward path, run rollback. On exhaustion of rollback, transition pending change to `drift_detected`, write `drift_detected` audit entry, emit Winston error + `apm.captureError` with marker `email_change_drift_detected`, surface a distinct error to the initiator.

**Rationale**:
- A single retry helper keeps the implementation small and uniform. Both call shapes are "idempotent PUT-replace against Kratos" so the same helper applies.
- The 3-attempt schedule fits comfortably inside the 10 s ceiling and leaves room for the surrounding code (DB writes, audit writes, exception construction).
- Jitter avoids thundering-herd retry against Kratos in a regional incident.

**Alternatives considered**:
- Linear backoff or no backoff: rejected (a transient network blip is often gone in ~500 ms — an immediate retry burns the budget without giving Kratos time to recover).
- More than 3 attempts: rejected (would push past the 10 s ceiling without measurably improving the absorb-transient-error goal).

---

## R6 — Confirmation `me` query: how do we expose pending state without a session?

**Decision**: The `me.pendingEmailChange` field (FR-022) is the *subject user's view*; it requires the standard authenticated session (the user is reading their own pending change). The *confirmation mutation* (`userEmailChangeConfirm`) is the root-level, session-less mutation per FR-018a — it takes only the token and resolves the pending change purely by token lookup.

**Rationale**:
- These are two distinct paths with distinct authorization rules. FR-018a is specifically about the confirm mutation (token = sole authority). FR-022 is about the read-side query, which the spec explicitly places under the `me` shape (i.e., requires a session).
- The token never appears in either response shape (FR-007a, FR-022); the audit query (FR-014b) and the masked-address security-signal notification (FR-016) are the only post-commit channels the subject sees.

**Alternatives considered**:
- Making `pendingEmailChange` also session-less and lookable-by-token: rejected (FR-022 is explicit; opening this would create an exfiltration surface where any token holder learns the proposed new email and admin identity).

---

## R7 — Email uniqueness re-check at confirm time

**Decision**: Implement uniqueness via a database query inside the SAME transaction that consumes the token and prepares the side-write. Query: `SELECT 1 FROM user WHERE LOWER(email) = LOWER($1) AND id != $userID LIMIT 1`. Combine with a Kratos lookup `kratosIdentityClient.listIdentities({ credentialsIdentifier: newEmail })` (case-insensitive on Kratos's side per `@ory/kratos-client` default). Both must return empty for the confirm to proceed.

**Rationale**:
- Re-checking uniqueness within the same transaction that flips the pending-change state from `initiated` → `confirmed` closes the FR-004a race window. If a benign uniqueness conflict arose between initiation and confirm, this catches it before any side-write.
- The Kratos check is independent of any Alkemio user — there can be a Kratos identity for an email that has no Alkemio user (e.g., mid-registration) and we still must reject.
- Case-insensitive comparison via `LOWER()` matches FR-006. The `email` column on `user` is already a single canonical form preserved as-supplied, with `unique: true` enforced at the DB level — but the unique constraint is by binary equality, so the explicit `LOWER()` is necessary to catch case variants.

**Alternatives considered**:
- Relying solely on the DB unique constraint to fail at commit: rejected (the failure surface is a Postgres unique-violation exception that is harder to translate to a clean FR-015 `conflict` error; and the Kratos side has no equivalent constraint we can trip on the Alkemio txn).
- Distributed lock / advisory lock: rejected (we already serialize per user via `WHERE state = 'initiated'` on the pending row; further locking is overkill).

---

## R8 — Outbound mail: which adapter, what payload shape?

**Decision**: Add two new entries to `NotificationEvent` — `USER_EMAIL_CHANGE_CONFIRMATION` and `USER_EMAIL_CHANGE_SECURITY_SIGNAL` — and publish them via the existing `NotificationExternalAdapter.sendExternalNotifications(event, payload)` pattern at `src/services/adapters/notification-external-adapter/notification.external.adapter.ts`. The payloads are new typed classes added to `@alkemio/notifications-lib` (extension; backward-compatible).

Confirmation payload fields (sent to the **proposed new** address):
- `recipientEmail` (the new address)
- `confirmationLink` (full URL: `${endpoints.client_web}/identity/email-change/confirm?token=${token}`)
- `initiatorRole` (`SELF` or `PLATFORM_ADMIN`)
- `expiryISO8601` (rendered timestamp for the message body)

Security-signal payload fields (sent to the **old** address):
- `recipientEmail` (the old address)
- `commitTimestampISO8601`
- `initiatorRole` (`SELF` or `PLATFORM_ADMIN`)
- `newEmailMasked` (e.g., `j***@e***.com` — masked here, not full)
- (No internal identifiers; no token.)

**Rationale**:
- The existing `NotificationExternalAdapter` is the canonical entry point — already integrates with `alkemio-notifications` over RabbitMQ, already supports the typed-payload pattern. Reusing it preserves Constitution Principle 10 (Simplicity) and Principle 4 (Explicit Data & Event Flow).
- Two distinct events (rather than one parametrized event) keeps the notifications-service rendering simple and the audit / debug surfaces clean.

**Alternatives considered**:
- Inline SMTP / direct `nodemailer`: rejected (bypasses the established mail abstraction; introduces credential handling in this module).
- Single combined event: rejected (different recipients, different templates, different trust signals — separate events are clearer).

**Open dependency note**: This requires a coordinated bump of `@alkemio/notifications-lib` and the corresponding template rendering in the `alkemio-notifications` service. That is tracked in tasks.md (Phase 2 output of `/speckit.tasks`), not here.

---

## R9 — `client-web` deep-link URL config

**Decision**: Add a new typed config key `endpoints.client_web: string` to `AlkemioConfig` (in `src/types/alkemio.config.ts`), populated by the `config.yml` chain. The confirmation deep link is built as `${endpoints.client_web}/identity/email-change/confirm?token=${token}`. The path segment is contracted in this plan, not configurable per environment.

**Rationale**:
- The existing config already has `hosting.endpoint_cluster` for backend URLs, but no externalized client-web URL — see `src/types/alkemio.config.ts:8`. Confirmation links are the first server-side context that needs to point *into* client-web, so this is a justified addition.
- Contracting the path (`/identity/email-change/confirm`) in spec/plan rather than config keeps the server and client-web aligned by versioned contract rather than by deploy-time accident.

**Alternatives considered**:
- Putting the entire URL in config (including the path): rejected (couples server config to client-web routing).
- Deriving from `hosting.endpoint_cluster`: rejected (these are different hosts in every non-trivial deployment).

---

## R10 — Audit-outcome canonical enumeration

**Decision**: The `email_change_audit_entry.outcome` column accepts the following values (Postgres native enum):

`initiated`, `initiation_failed`, `confirmed`, `committed`, `rolled_back`, `expired`, `superseded`, `drift_detected`, `drift_resolved`, `drift_resolution_failed`, `security_signal_failed`, `session_invalidation_failed`, `rejected_validation`, `rejected_conflict`, `rejected_used_token`, `rejected_expired_token`

**Rationale**:
- Drawn directly from FR-014b's enumeration plus the `rejected_*` outcomes for confirm-time rejection paths (FR-007 / FR-004a / FR-015). The `rejected_*` outcomes are split by reason to satisfy the FR-014b query's non-leaky failure-reason field while still being usable for analytics.
- A Postgres native enum is preferred over varchar for both space economy and write-time validation. Migration adds the enum type explicitly.

**Alternatives considered**:
- One generic `rejected` outcome with the reason in a separate column: considered, but the spec's audit-query (FR-014b) requires `outcome` to be one of the enumerated values, and splitting `rejected_*` makes the GraphQL enum more useful to admins.

---

## R11 — Email masking helper

**Decision**: A small utility `maskEmail(email: string): string` that produces `${firstChar}***@${firstChar}***.${tld}`. Examples:
- `valentin.yanakiev@gmail.com` → `v***@g***.com`
- `j@e.io` → `j***@e***.io`
- `a@b` (no TLD) → `a***@b***` (defensive fallback)

**Rationale**:
- Matches the FR-016 example shape `j***@e***.com`.
- Single-purpose, pure function; one test file covers the small input variation set. No need for a library dependency.

**Alternatives considered**:
- Show half of the local part: rejected (leaks more than necessary for the security-signal goal).
- Show nothing: rejected (FR-016 explicitly requires a partially-masked rendering, not full redaction).

---

## R12 — Pending-change retention (30 days post-terminal) — when does the purge run?

**Decision**: The 30-day retention purge (FR-020) runs as a daily idempotent cleanup at the existing maintenance scheduling tier (likely a NestJS `@Cron` job under `src/services/infrastructure/scheduled/` or equivalent — to be confirmed at implementation time; this is a small additional task, not a planning unknown). Audit entries (FR-014a) are NOT purged — they are retained indefinitely.

**Rationale**:
- A daily purge is sufficient: the cutoff is 30 days, not 30 minutes, so cadence is not load-bearing.
- The purge is independent of the email-change flow itself; failing-purge does not affect commit correctness, only operational hygiene.

**Alternatives considered**:
- Purge on every state transition: rejected (couples a hot write path to a cold sweep; performance penalty for no win).
- No purge (let admins issue DELETEs): rejected (FR-020 mandates the 30-day window).

---

## R13 — Testing strategy

**Decision**:
- **Unit (Vitest)**: state-machine transitions, retry helper under fault injection, token generator (entropy / encoding), email masking utility, uniqueness re-check decision logic, authorization decision points (self vs admin), audit-entry construction (correct outcome for each transition).
- **Integration (`*.it-spec.ts`)**: end-to-end flow through real PostgreSQL and a mocked Kratos client (HTTP-level mock, not method-level), including:
  - Self-initiate → confirm → commit → security-signal sent → old-email login rejected
  - Admin-initiate → admin status query observes outcome
  - Forward failure on Kratos write → rollback restores pre-change state
  - Rollback failure → `drift_detected` audit entry written → `adminUserEmailChangeDriftResolve` reconciles
  - Token reuse / expiry / supersession rejection
  - Confirm-time conflict rejection (when another user grabs the address between initiate and confirm)
- **No e2e at the network level** for this iteration — Kratos is mocked. A future `*.e2e-spec.ts` can add live Kratos coverage once the existing Kratos test harness in `pnpm start:services` is wired into CI.

**Rationale**: Risk-based testing (Constitution Principle 6). The state machine and retry/rollback are high signal — bugs here directly cause the drift the spec is built to prevent. Resolver-DTO pass-throughs are low signal and covered transitively by integration.

---

## Summary

| ID | Topic | Decision (one-liner) |
| --- | --- | --- |
| R1 | Kratos trait update API | `updateIdentity` (full replace, including `verifiable_addresses`) |
| R2 | Kratos session invalidation | `disableIdentitySessions(id)` — single call |
| R3 | Token generation | `crypto.randomBytes(32).toString('base64url')` → 256 bits, 43 chars |
| R4 | Commit ordering | Kratos first, then Alkemio (cheap local rollback) |
| R5 | Retry & drift | 3 attempts, exp. backoff with jitter; drift on rollback exhaustion |
| R6 | Confirm session model | `userEmailChangeConfirm` is session-less; `me.pendingEmailChange` is session-required |
| R7 | Uniqueness re-check | DB `LOWER()` query + Kratos `listIdentities` in the confirm transaction |
| R8 | Outbound mail | Extend `NotificationEvent` + reuse `NotificationExternalAdapter` |
| R9 | client-web URL | New `endpoints.client_web` config; contracted path |
| R10 | Audit outcomes | 16-value Postgres native enum |
| R11 | Masking | `${firstChar}***@${firstChar}***.${tld}` |
| R12 | Retention purge | Daily idempotent cleanup; audit entries never purged |
| R13 | Test strategy | Unit for state machine + utils; integration for end-to-end with mocked Kratos |

All NEEDS CLARIFICATION items from Technical Context are resolved by spec.md §Clarifications. No open research items remain.
