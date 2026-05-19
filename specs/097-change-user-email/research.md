# Phase 0 — Research Decisions

**Feature**: 097-change-user-email (Platform Admin, No Verification)
**Date**: 2026-05-13
**Last Updated**: 2026-05-18 (smaller MVP — token / verification decisions moved to 098's research)

Spec.md §Clarifications resolves all open questions by direct contract. This document records the **technical research decisions** that bridge those clarifications to concrete API and pattern choices. Each decision lists the alternatives that were considered and the rationale for the chosen path. Companion spec 098 owns the additional research decisions specific to the email-ownership verification flow (token generation, TTL, supersession semantics, confirm-mutation session model).

---

## R1 — Kratos: which admin API call replaces the `email` trait?

**Decision**: Use `kratosIdentityClient.updateIdentity({ id, updateIdentityBody })` with a full traits payload (new `email` plus the preserved `firstName` / `lastName` / etc.). The call MUST also send a fresh `verifiable_addresses` entry for the new email with `verified: true` and `via: 'email'` so the user is not re-prompted to verify (FR-011).

**Rationale**:
- `updateIdentity` is the documented Kratos admin endpoint for in-place identity trait + verifiable-address replacement (`PUT /admin/identities/{id}`). It accepts both `traits` and `verifiable_addresses` in a single atomic write, which matches FR-010 ("same identity id") and FR-011 ("marked verified at commit").
- The admin's out-of-band manual verification of the subject's identity (see spec.md "Why this spec ships first") is the trust source for the `verified=true` flag in this spec. Spec 098 introduces platform-mediated proof-of-ownership for the self-service case.
- `patchIdentity` (RFC 6902 JSON Patch) is available on the same client but does NOT atomically guarantee that the `verifiable_addresses` array stays consistent with the new trait — applying a single `replace /traits/email` op leaves the old verifiable_address intact and the new one absent.

**Alternatives considered**:
- `patchIdentity` with multiple ops: rejected (non-atomic across array fields).
- A two-step `recoveryFlow` + manual verification: rejected (FR-011 forbids re-verifying; also out of scope per the issue).

---

## R2 — Kratos: how to invalidate every session for an identity on commit?

**Decision**: Use `kratosIdentityClient.disableIdentitySessions({ id })`. The single call disables ALL active sessions for the identity in one shot.

**Rationale**:
- This satisfies FR-017 with one round-trip — the bounded retry budget of FR-017a (2–3 attempts, ~5–10 s) is therefore trivially honored by a simple `for` loop with backoff around the single call.
- The `listIdentitySessions` → loop-`disableSession` alternative is already partially present in the codebase (`kratos.service.ts:624`) for diagnostic use; it would require N round-trips and adds a window during which new sessions could appear between the list and the disable.

**Alternatives considered**:
- Enumerate-and-disable per-session: rejected (more network calls, weaker atomicity).

---

## R3 — Token generation

**Not applicable to this spec.** This spec does NOT issue a confirmation token (the admin verifies the subject's identity out-of-band; there is no platform-mediated proof-of-ownership step). Companion spec 098 owns the token-generation research decision (entropy floor, encoding, length); see `/specs/098-self-service-email-change/research.md`.

---

## R4 — Commit ordering: write Alkemio first or Kratos first?

**Decision**: Write Kratos first, then Alkemio. On Kratos failure (after retry budget), no Alkemio change has happened — no compensation needed. On Alkemio failure (after retry budget), compensate by reverting the Kratos identity (re-apply the old `email` trait + old verifiable-address bookkeeping) within the same FR-009a retry budget.

**Rationale**:
- Kratos is the authority for "what email can log in". Even if Alkemio is updated first, a login attempt would still hit Kratos and fail until Kratos is updated — so reaching a half-committed `Alkemio=new, Kratos=old` state leaves the user inaccessible. Neither half-state is acceptable; we want the rollback path to be cheap and idempotent. Reverting Kratos (idempotent `updateIdentity` back to old trait) is straightforward.
- The reverse ordering — Alkemio first — would require us to revert a TypeORM write on failure of the external call. We can roll back the local transaction freely while it is still in-flight, but the Kratos call cannot happen inside the same transaction; the moment we commit the local txn we have lost the ability to atomic-roll-back. Doing Kratos first keeps the local txn open until both sides have succeeded.

**Alternatives considered**:
- Alkemio first: rejected per the above; loses the cheap local-transaction rollback.
- Two-phase commit / outbox pattern: rejected (FR-009 explicitly says "compensating-action approach is acceptable"; an outbox introduces async semantics that contradict "no background reconciliation").

---

## R5 — Compensating-rollback retry, and the `drift_detected` transition

**Decision**: Both the forward commit (Kratos update + Alkemio update) and the compensating rollback (Kratos revert) use the same retry helper: 3 attempts, exponential backoff with jitter (e.g., 500 ms → 1.5 s → 3.5 s, totalling ~5.5 s — within the FR-009 / FR-009a ~5–10 s budget). On exhaustion of the forward path, run rollback. On exhaustion of rollback, write a `drift_detected` audit entry, emit Winston error + `apm.captureError` with marker `email_change_drift_detected`, surface a distinct error to the admin.

**Rationale**:
- A single retry helper keeps the implementation small and uniform.
- The 3-attempt schedule fits comfortably inside the 10 s ceiling and leaves room for the surrounding code (DB writes, audit writes, exception construction).
- Jitter avoids thundering-herd retry against Kratos in a regional incident.

**Alternatives considered**:
- Linear backoff or no backoff: rejected (a transient network blip is often gone in ~500 ms — an immediate retry burns the budget without giving Kratos time to recover).
- More than 3 attempts: rejected (would push past the 10 s ceiling without measurably improving the absorb-transient-error goal).

---

## R6 — Drift state without a pending entity: where do observed values live?

**Decision**: For `drift_detected` audit entries, the existing `old_email` and `new_email` columns on `platform_audit_entry` carry the per-side observed values: `old_email` = the value observed on the Alkemio side at the moment of drift (= the original pre-change email, since the Alkemio write never started due to Kratos-first ordering); `new_email` = the value observed on the Kratos side at the moment of drift (= the attempted new email, since the Kratos write succeeded but the revert failed). The drift-resolve admin mutation reads the latest audit entry (filtered to `category = 'email_change'`), validates that `canonicalEmail` is one of those two values, and applies alignment writes only where the observed value differs.

**Rationale**:
- This spec does NOT introduce a `pending` entity (no multi-step lifecycle is needed). Drift state therefore needs to live somewhere; the audit entry is the natural home — it already carries `old_email`, `new_email`, `subject_user_id`, `failure_reason`, and `timestamp`, which is exactly what the drift-resolve mutation needs to operate.
- The Kratos-first commit ordering (R4) means the column semantics are deterministic at drift time, so we don't need separate `observed_alkemio_email` / `observed_kratos_email` columns to disambiguate.
- Spec 098 introduces the `email_change_pending` entity natively as part of its verification flow; when 098 lands, drift entries can additionally carry a `pending_change_id` link (added as a nullable column in 098's migration) but the audit-entry-as-drift-record contract from this spec continues to work unchanged.

**Alternatives considered**:
- Add a dedicated `email_change_drift` table just for drift records: rejected — needless duplication of structure already on the audit entry, plus a second table the drift-resolve admin mutation would have to consult. Audit-as-source-of-truth is simpler.
- Add `observed_alkemio_email` / `observed_kratos_email` columns to the audit entry: rejected — extra columns whose contents are derivable from the Kratos-first commit ordering. If the ordering ever changes (which would itself be a spec change), the audit-entry semantics would need to be re-documented anyway.

---

## R7 — Email uniqueness check (single-pass at commit time)

**Decision**: Implement uniqueness via a database query inside the SAME transaction that prepares the Alkemio side-write. Query: `SELECT 1 FROM user WHERE LOWER(email) = LOWER($1) AND id != $userID LIMIT 1`. Combine with a Kratos lookup `kratosIdentityClient.listIdentities({ credentialsIdentifier: newEmail })` (case-insensitive on Kratos's side per `@ory/kratos-client` default). Both must return empty for the commit to proceed.

**Rationale**:
- Since there is no multi-step flow (no "initiate then confirm"), we only need a single uniqueness check at commit time. There is no equivalent of 098's FR-004a confirm-time re-check.
- Case-insensitive comparison via `LOWER()` matches FR-006. The `email` column on `user` is already a single canonical form preserved as-supplied, with `unique: true` enforced at the DB level — but the unique constraint is by binary equality, so the explicit `LOWER()` is necessary to catch case variants.
- The Kratos check is independent of any Alkemio user — there can be a Kratos identity for an email that has no Alkemio user (e.g., mid-registration) and we still must reject.

**Alternatives considered**:
- Relying solely on the DB unique constraint to fail at commit: rejected (the failure surface is a Postgres unique-violation exception that is harder to translate to a clean FR-015 `conflict` error; and the Kratos side has no equivalent constraint).
- Distributed lock / advisory lock: rejected (overkill for a synchronous admin operation; admin tooling is not high-frequency).

---

## R8 — Outbound notifications: which adapter, what events / payloads?

**Decision**: Add THREE new entries to `NotificationEvent` and publish each via the existing `NotificationExternalAdapter.sendExternalNotifications(event, payload)` pattern at `src/services/adapters/notification-external-adapter/notification.external.adapter.ts`. Each payload is a new typed class added to `@alkemio/notifications-lib` (extension; backward-compatible).

**Event 1 — `USER_EMAIL_CHANGE_SECURITY_SIGNAL`** (sent to the **OLD** address — FR-016):
- `recipientEmail` (the old address)
- `commitTimestampISO8601`
- `initiatorRole` (`PLATFORM_ADMIN` for this spec; `SELF` is added by spec 098)
- `newEmailMasked` (e.g., `j***@e***.com` — masked here, NOT full, because the recipient may be a now-hostile party at an address the user lost control of)
- (No internal identifiers; no token.)

**Event 2 — `USER_EMAIL_CHANGE_NEW_ADDRESS_NOTIFICATION`** (sent to the **NEW** address — FR-016c):
- `recipientEmail` (the new address)
- `commitTimestampISO8601`
- `initiatorRole`
- `newEmailFull` (the recipient IS the legitimate new-mailbox holder; masking would just confuse them about their own address)
- `loginUrl` (implementation chooses the exact path; built from existing client-web host config)
- (No internal identifiers.)

**Event 3 — `USER_EMAIL_CHANGE_GLOBAL_ADMIN_NOTIFICATION`** (fanned out by the notifications-service to **all platform admins** across email / push / in-app, mirroring the existing Global Role Change pattern — FR-016d):
- `subjectProfileSummary` (`{ id, displayName }`)
- `oldEmail` (full — admin recipients are trusted)
- `newEmail` (full — admin recipients are trusted)
- `initiatorProfileSummary` (`{ id, displayName }`)
- `initiatorRole`
- `commitTimestampISO8601`
- `triggerOutcome` (`COMMITTED` or `DRIFT_DETECTED` — so the template / recipient UI can render appropriate phrasing)

The server publishes ONE event per outcome; the notifications-service is responsible for enumerating admin recipients and selecting per-recipient channels. This matches the existing Global Role Change architecture and avoids duplicating admin-recipient logic in this feature module.

**Rationale**:
- The existing `NotificationExternalAdapter` is the canonical entry point — already integrates with `alkemio-notifications` over RabbitMQ, already supports the typed-payload pattern, and already implements admin fan-out for Global Role Change.
- Three distinct events (rather than one parametrized event) keep templates simple — different recipients, different threat models, different content rules. Splitting also lets the audit table record per-channel failure distinctly (`security_signal_failed`, `new_address_notification_failed`, `global_admin_notification_failed`).
- Masking applied at the OLD address (FR-016) is dropped for the NEW address (FR-016c, legitimate recipient) and dropped for the admin fan-out (FR-016d, trusted recipients).

**Alternatives considered**:
- A single combined event with a `recipientType` discriminator: rejected — recipient sets / channels / content rules are too divergent.
- Inline SMTP / direct `nodemailer`: rejected (bypasses the established abstraction).
- Server-side enumeration of platform admins for FR-016d: rejected (duplicates logic the notifications-service already owns for Global Role Change; would also create a stale-recipient race window).

**Open dependency note**: This requires a coordinated bump of `@alkemio/notifications-lib` and corresponding template additions (3 new templates) in the `alkemio-notifications` service. Tracked in tasks.md (T013, T014, T015).

---

## R9 — `client-web` deep-link URL config

**Not applicable to this spec.** This spec sends no confirmation link to a new mailbox; there is no deep link to construct. Companion spec 098 introduces the `endpoints.client_web` config key as part of its verification flow.

---

## R10 — Audit-outcome canonical enumeration

**Decision**: The `platform_audit_entry.outcome` column accepts the following 11 values (Postgres native enum `email_change_audit_outcome`):

`committed`, `rolled_back`, `drift_detected`, `drift_resolved`, `drift_resolution_failed`, `security_signal_failed`, `new_address_notification_failed`, `global_admin_notification_failed`, `session_invalidation_failed`, `rejected_validation`, `rejected_conflict`

The enum is named after the `email_change` category because the underlying `platform_audit_entry` table is a platform-wide audit-log foundation (see R14 below) but this spec is the FIRST consumer and the outcome vocabulary is email-change-specific. Future audit categories will either introduce their own outcome enums or use the `details: jsonb` column with stringified outcomes.

**Rationale**:
- Drawn from the outcomes this spec actually writes. Companion spec 098 ADDS (additively) the verification-flow outcomes when it lands (`initiated`, `initiation_failed`, `confirmed`, `expired`, `superseded`, `rejected_used_token`, `rejected_expired_token`).
- A Postgres native enum is preferred over varchar for both space economy and write-time validation. Migration adds the enum type explicitly.

**Alternatives considered**:
- One generic `rejected` outcome with the reason in a separate column: considered, but the spec's audit-query (FR-014b) requires `outcome` to be one of the enumerated values, and splitting `rejected_validation` / `rejected_conflict` makes the GraphQL enum more useful to admins.

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

## R12 — Retention

**Decision**: Audit entries are retained indefinitely (FR-014a). This spec introduces NO automatic purge. This spec introduces no `email_change_pending` entity, so there is no pending retention concept here. Companion spec 098 introduces its own 30-day pending-record retention (FR-020 in 098).

**Rationale**:
- Audit entries are the system of record for forensic queries; bounding them by time would defeat the purpose.
- Per-subject removal is handled by the existing platform user-deletion workflow.

**Alternatives considered**:
- Daily purge of old audit entries: rejected (would defeat the forensic-record purpose).

---

## R13 — Testing strategy

**Decision**:
- **Unit (Vitest)**: synchronous commit happy path, retry helper under fault injection, email masking utility, uniqueness check decision logic, authorization decision points, audit-entry construction (correct outcome for each transition), drift-resolve correctness for every branch.
- **Integration (`*.it-spec.ts`)**: end-to-end flow through real PostgreSQL and a mocked Kratos client (HTTP-level mock, not method-level), including:
  - Admin-change happy path → security-signal sent → old-email login rejected → audit `committed`
  - Forward failure on Kratos write → no Alkemio change → audit `rolled_back`
  - Forward success + Alkemio failure → Kratos reverted → audit `rolled_back`
  - Forward failure on Kratos AND revert failure → audit `drift_detected` → admin invokes `adminUserEmailChangeDriftResolve` → both sides aligned → audit `drift_resolved`
  - Validation rejections (malformed, no-change, conflict) → no side-write → audit `rejected_*`
- **No e2e at the network level** for this iteration — Kratos is mocked.

**Rationale**: Risk-based testing (Constitution Principle 6). The synchronous commit path and retry/rollback are high signal — bugs here directly cause the drift the spec is built to prevent. Resolver-DTO pass-throughs are low signal and covered transitively by integration.

---

## R14 — Audit storage shape: feature-scoped table vs platform-wide audit-log foundation

**Decision**: Introduce the audit table as `platform_audit_entry` — a **platform-wide audit-log foundation** rather than a feature-scoped `email_change_audit_entry`. The table carries a `category` enum column (`platform_audit_category`) whose initial value is `email_change`, plus a nullable `details: jsonb` column for category-specific structured payload that doesn't fit the typed columns. The email-change feature is the FIRST consumer; future ISO 27001 categories (`authentication`, `access_control`, `data_privacy`, `configuration_change`, etc.) will be added by extending the `platform_audit_category` enum additively (non-breaking) and writing rows with the new category — either reusing the existing typed columns where applicable (subject_user_id, initiator_user_id, initiator_role, etc.) or leaving them NULL and using `details`.

**Rationale**:
- The team's mid-term goal is ISO 27001 certification in the next 6–12 months. ISO 27001 needs platform-wide audit-log evidence (auth events, access changes, data exports, admin operations). Designing this table feature-scoped now would force a generalisation migration (or a parallel audit table) later — duplicating effort.
- A platform-wide audit log is also closer to what auditors actually want: a single source of truth for "who did what when" rather than N feature-specific log tables they have to correlate.
- Choosing minimal forward-compat hooks (category discriminator + JSONB details) — rather than a fully-generic JSONB-everywhere shape — preserves type safety for the email-change events that this spec actually exercises. We avoid committing to a generic abstraction before ISO 27001 has produced its concrete evidence-requirements list, but we avoid a future rename / restructure for the table.
- The GraphQL surface (`platformAdmin.userEmailChangeAuditEntries`, `UserEmailChangeAuditEntry` type, etc.) is **not** generalised — it remains an email-change-feature projection over the generic table, filtered by `category = 'email_change'`. Future categories introduce their own GraphQL surfaces. This keeps the public contract scoped and lets each feature own its read-side.

**Alternatives considered**:
- Keep `email_change_audit_entry` feature-scoped now; introduce a sibling `platform_audit_entry` table or generalise this one when ISO 27001 work starts: rejected — doubles operational complexity (two parallel audit-log tables to keep consistent) OR forces a non-trivial table rename + data migration during ISO 27001 work.
- Generalise fully now: rename to `platform_audit_entry`; drop all typed email columns; put everything in JSONB: rejected — commits to a generic shape that may not match ISO 27001 evidence requirements once they're known; loses type-safety / DB-level enum validation for the email-change events this spec exercises today.
- Defer entirely (keep feature-scoped, address ISO 27001 in a separate spec when its requirements are concrete): considered. The deciding factor is that the 6–12 month timeline is short enough that "design for it now" is not speculative — the team has clear ISO 27001 intent.

**Open dependency note**: This decision is recorded in spec.md §Clarifications Session 2026-05-19. When ISO 27001 work begins, the next spec will (a) extend the `platform_audit_category` enum, (b) possibly introduce category-specific outcome enums or migrate the `outcome` column to text + service-layer validation, and (c) add GraphQL surfaces per category. No DB-level table rename or restructure is anticipated.

---

## Summary

| ID | Topic | Decision (one-liner) |
| --- | --- | --- |
| R1 | Kratos trait update API | `updateIdentity` (full replace, including `verifiable_addresses`) |
| R2 | Kratos session invalidation | `disableIdentitySessions(id)` — single call |
| R3 | Token generation | N/A in this spec — owned by 098 |
| R4 | Commit ordering | Kratos first, then Alkemio (cheap local rollback) |
| R5 | Retry & drift | 3 attempts, exp. backoff with jitter; drift on rollback exhaustion |
| R6 | Drift state | Lives on the `drift_detected` audit entry (no `pending` entity in this spec) |
| R7 | Uniqueness check | DB `LOWER()` query + Kratos `listIdentities`, once at commit time |
| R8 | Outbound notifications | Extend `NotificationEvent` with THREE events (OLD-address signal, NEW-address notification, global-admin fan-out) + reuse `NotificationExternalAdapter` (admin fan-out reuses the existing Global Role Change pattern) |
| R9 | client-web URL | N/A in this spec — owned by 098 |
| R10 | Audit outcomes | 11-value Postgres native enum `email_change_audit_outcome`, scoped to `email_change` category; 098 extends additively |
| R14 | Audit storage shape | `platform_audit_entry` — platform-wide audit-log foundation with `category` discriminator + `details: jsonb` column; designed for ISO 27001 reuse in 6–12 months without DB migration |
| R11 | Masking | `${firstChar}***@${firstChar}***.${tld}` |
| R12 | Retention | Audit entries indefinite; no pending entity in this spec |
| R13 | Test strategy | Unit for service + utils; integration for end-to-end with mocked Kratos |

All NEEDS CLARIFICATION items from Technical Context are resolved by spec.md §Clarifications. No open research items remain.
