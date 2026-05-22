# Phase 0 — Research Decisions

**Feature**: 097-change-user-email (Platform Admin, No Verification)
**Date**: 2026-05-13
**Last Updated**: 2026-05-22 (§R8 reconciled to the FOUR-event implementation — added Event 4, the per-space admin fan-out FR-016e, plus the `space_admin_notification_failed` outcome; code is source of truth) — previously 2026-05-21 (§R4 / §R7 reconciled to the no-DB-transaction implementation; §R15 crash-window breadcrumb added) and 2026-05-18 (smaller MVP; token / verification decisions moved to 098's research)

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
- The Alkemio `User.email` write is a single `UserService.save` that auto-commits immediately — the implementation deliberately uses **no surrounding DB transaction** (an open transaction cannot usefully span the multi-second retried Kratos HTTP call, and holding a DB connection + row locks across that retry budget is itself undesirable). An Alkemio-first ordering would therefore commit the local write before Kratos is confirmed, leaving an already-committed DB write to undo on Kratos failure. Kratos-first instead places the *first* committed write on the side whose compensation is cheap and idempotent (an `updateIdentity` revert); the Alkemio write is attempted only after the Kratos write has succeeded.

**Alternatives considered**:
- Alkemio first: rejected per the above — it commits the local DB write before the Kratos write is confirmed, forcing a DB-side compensation; Kratos-first keeps the cheap idempotent revert on the side that commits first.
- Two-phase commit / outbox pattern: rejected (FR-009 explicitly says "compensating-action approach is acceptable"; an outbox introduces async semantics that contradict "no background reconciliation").

**Implementation note (code is source of truth — reconciled 2026-05-21)**: `commitAcrossSides` performs the Alkemio write as a single `UserService.save` with no surrounding DB transaction. An earlier draft of this section described keeping a "local transaction open until both sides have succeeded"; that was never implemented and is not sound — a DB transaction cannot span the retried Kratos HTTP call. The all-or-nothing guarantee (FR-009) is delivered entirely by the compensating Kratos revert (§R5) and the drift-detected path on revert exhaustion — never by a DB-transaction rollback.

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

**Decision**: For `drift_detected` audit entries, the `details: jsonb` column on `platform_audit_entry` carries the per-side observed values under the email-change category's documented keys: `details.oldEmail` = the value observed on the Alkemio side at the moment of drift (= the original pre-change email, since the Alkemio write never started due to Kratos-first ordering); `details.newEmail` = the value observed on the Kratos side at the moment of drift (= the attempted new email, since the Kratos write succeeded but the revert failed). The drift-resolve admin mutation reads the latest unresolved-drift audit entry (filtered to `category = 'email_change'` AND `outcome = 'drift_detected'` AND no subsequent `drift_resolved` row), validates that `canonicalEmail` is one of those two values, and applies alignment writes only where the observed value differs. The resolution row reuses the drift row's `correlation_id` so the two rows are explicitly linked (see data-model.md §Correlation semantics). (§R15 generalises this "latest unresolved" lookup to also surface a `commit_started` crash breadcrumb; the resolution mechanics described here are unchanged.)

**Rationale**:
- This spec does NOT introduce a `pending` entity (no multi-step lifecycle is needed). Drift state therefore needs to live somewhere; the audit entry is the natural home — it already carries `subject_user_id`, `failure_reason`, `timestamp`, `correlation_id`, and the per-category `details` JSONB payload (which is exactly where `oldEmail` / `newEmail` belong under Path A).
- The Kratos-first commit ordering (R4) means the JSONB-key semantics are deterministic at drift time, so we don't need separate `observed_alkemio_email` / `observed_kratos_email` keys to disambiguate.
- Spec 098 introduces the `email_change_pending` entity natively as part of its verification flow; when 098 lands, drift entries can additionally carry a `details.pendingChangeId` link (no DDL change — just a new JSONB key documented by 098) but the audit-entry-as-drift-record contract from this spec continues to work unchanged.

**Alternatives considered**:
- Add a dedicated `email_change_drift` table just for drift records: rejected — needless duplication of structure already on the audit entry, plus a second table the drift-resolve admin mutation would have to consult. Audit-as-source-of-truth is simpler.
- Add `observed_alkemio_email` / `observed_kratos_email` typed columns to the audit entry: rejected — extra columns whose contents are derivable from the Kratos-first commit ordering. If the ordering ever changes (which would itself be a spec change), the audit-entry semantics would need to be re-documented anyway. Also violates the Path A principle that typed columns must be cross-category.

---

## R7 — Email uniqueness check (single-pass at commit time)

**Decision**: Implement uniqueness as a single pre-commit check — **not** inside a DB transaction. The Alkemio side uses `UserService.getUserByEmail(newEmail)` (case-insensitive lookup on the `user.email` column); the Kratos side uses `KratosService.findIdentityByEmail(newEmail)`. The new email is a conflict when a *different* Alkemio user holds it, or when a Kratos identity other than the subject's own holds it. Both checks run once, before the two-side commit begins.

**Rationale**:
- Since there is no multi-step flow (no "initiate then confirm"), we only need a single uniqueness check at commit time. There is no equivalent of 098's FR-004a confirm-time re-check.
- Case-insensitive comparison via `LOWER()` matches FR-006. The `email` column on `user` is already a single canonical form preserved as-supplied, with `unique: true` enforced at the DB level — but the unique constraint is by binary equality, so the explicit `LOWER()` is necessary to catch case variants.
- The Kratos check is independent of any Alkemio user — there can be a Kratos identity for an email that has no Alkemio user (e.g., mid-registration) and we still must reject.
- The check is **not** wrapped in a DB transaction with the Alkemio side-write — there is a deliberately-accepted TOCTOU window between the check and the commit. Closing it would require a per-subject lock (rejected just below as overkill for low-frequency admin tooling). The `user.email` DB unique constraint is the hard backstop: a racing duplicate that slips past the check fails at the DB and surfaces as a commit-time error, not a silent duplicate.

**Alternatives considered**:
- Relying solely on the DB unique constraint to fail at commit: rejected (the failure surface is a Postgres unique-violation exception that is harder to translate to a clean FR-015 `conflict` error; and the Kratos side has no equivalent constraint).
- Distributed lock / advisory lock: rejected (overkill for a synchronous admin operation; admin tooling is not high-frequency).

---

## R8 — Outbound notifications: which adapter, what events / payloads?

**Decision**: Add FOUR new entries to `NotificationEvent` and publish each via the existing `NotificationExternalAdapter.sendExternalNotifications(event, payload)` pattern at `src/services/adapters/notification-external-adapter/notification.external.adapter.ts`. Each payload is a new typed class added to `@alkemio/notifications-lib` (extension; backward-compatible). Events 1–3 are published exactly once per triggering outcome; event 4 (the per-space fan-out) is published once per space the subject is a member of.

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

**Event 3 — `USER_EMAIL_CHANGE_GLOBAL_ADMIN_NOTIFICATION`** (fanned out to the platform-admin recipient set, resolved **on the server** at publish time — FR-016d):
- `recipients: UserPayload[]` — the resolved platform-admin recipient set, embedded in the payload by the shared `buildBaseEventPayload()` helper, exactly as every other notification event already does (see the resolution model below).
- `subjectProfileSummary` (`{ id, displayName }`)
- `oldEmail` (full — admin recipients are trusted)
- `newEmail` (full — admin recipients are trusted)
- `initiatorProfileSummary` (`{ id, displayName }`)
- `initiatorRole`
- `commitTimestampISO8601`
- `triggerOutcome` (`COMMITTED` or `DRIFT_DETECTED` — so the template can render appropriate phrasing)
- `subjectMemberships` / `subjectGlobalRoles` — the subject's space/organisation footprint and global-role credentials. **Retained only as optional informational context for the admin email body** (e.g., "this user administers 3 spaces"), NOT as recipient-resolution inputs. The server already builds these via `user.email.change.subject.footprint.util.ts`, so keeping them is additive; they MAY be dropped if the admin template does not surface them — an implementation call, not a wire-contract requirement.

**Event 4 — `USER_EMAIL_CHANGE_SPACE_ADMIN_NOTIFICATION`** (a **per-space** fan-out — published once per space the subject is a member of, delivered to that space's admins and leads — FR-016e):
- The payload extends `NotificationEventPayloadSpace`, so it carries the standard space-event envelope: `eventType`, `triggeredBy`, `platform`, a server-resolved `recipients: UserPayload[]` array (that space's admins/leads, minus the subject), and the single `space` the event concerns.
- `subjectProfileSummary` (`{ id, displayName }`)
- `oldEmail` (full — admin / lead recipients are trusted)
- `newEmail` (full — same rationale)
- `initiatorProfileSummary` (`{ id, displayName }`)
- `initiatorRole`
- `commitTimestampISO8601`
- `triggerOutcome` (`COMMITTED` or `DRIFT_DETECTED`)
- (No `subjectMemberships` / `subjectGlobalRoles` — this event already concerns exactly one space; broader footprint context is the global-admin event's job.)

**Recipient resolution model — reuse the existing Global Role Change pattern**:

The global-admin fan-out resolves its recipient set **on the server**, identically to `PLATFORM_ADMIN_GLOBAL_ROLE_CHANGED`:
- `NotificationPlatformAdapter` calls `getNotificationRecipientsPlatform()` → `NotificationRecipientsService.getRecipients()`, which resolves recipients against the global-admin credential set (`getGlobalAdminCriteria()` → `[GLOBAL_ADMIN, GLOBAL_SUPPORT, GLOBAL_LICENSE_MANAGER]`), filtered by each candidate's per-user notification setting and by the `RECEIVE_NOTIFICATIONS_ADMIN` privilege.
- The resolved list is embedded as `recipients: UserPayload[]` in the published payload via `buildBaseEventPayload()` — the shape every other notification event already carries.
- The notifications-service does NOT resolve recipients: it renders the template and sends over the server-provided list, identical to every other event.
- The subject of the change MUST be excluded from this set — the subject already receives the security-signal and new-address messages (spec.md FR-009 / clarification 2026-05-20).
- A `USER_EMAIL_CHANGE_GLOBAL_ADMIN_NOTIFICATION` case is added to `getChannelsSettingsForEvent()`, gated on the dedicated `notification.platform.admin.userEmailChanged` per-user setting that this feature ships (default email-on; backfilled onto every existing `user_settings` row by migration `1779287475191-AddUserEmailChangedNotificationSetting`) so admins can opt out of this notification specifically.

**Per-space fan-out — recipient resolution (Event 4 / FR-016e)**:

The space-admin fan-out reuses the same server-side resolution pipeline, scoped per space:
- `UserEmailChangeService.publishSpaceAdminNotifications` resolves the subject footprint once, then publishes one event per space the subject is a member of — any role (member, lead, or admin) — via `NotificationSpaceAdapter.userEmailChangeSpaceAdmin(eventData, spaceId)`. A subject who belongs to no space produces zero events.
- For each space, `NotificationRecipientsService` resolves recipients against that space's authorization policy and a `getSpaceAdminAndLeadCredentialCriteria()` set — `SPACE_ADMIN ∪ SPACE_SUBSPACE_ADMIN ∪ SPACE_LEAD`. **No `RECEIVE_NOTIFICATIONS_ADMIN` privilege filter is applied** — a space lead who lacks that platform-level privilege must still be notified (FR-016e); the per-user `notification.space.admin.userEmailChanged` setting is the only gate. (That setting is also shipped by this feature — default email-on, backfilled by migration `1779480100000-AddSpaceAdminEmailChangeNotificationSetting`.)
- The resolved recipients (minus the subject) are embedded as `recipients: UserPayload[]` via `buildSpacePayload()`; the notifications-service consumes the list directly, exactly as for the global-admin event.
- Each per-space publish runs under its own retry / audit envelope (`runWithAuditFailure`), so one space's publish failure neither blocks the others nor masks them — exhaustion writes a `space_admin_notification_failed` audit row for that space; the commit always stands. A footprint / profile resolution failure before any per-space publish writes a single `space_admin_notification_failed` row.
- A `USER_EMAIL_CHANGE_SPACE_ADMIN_NOTIFICATION` case is added to `getChannelsSettingsForEvent()` (→ `notification.space.admin.userEmailChanged`) and to the space-authorization-policy branch of the recipient resolver.

**Why resolve on the server** (this reverses the original FR-016d delivery-time-resolution design):
1. **No authenticated path in `alkemio-notifications`**: the notifications-service has no wired authentication to the server's GraphQL API — its only outbound call (the blacklist sync) is anonymous, and platform-admin emails / `usersWithAuthorizationCredential` are privileged (`READ_USERS`). Delivery-time resolution would require building service-account authentication (non-interactive Kratos login, token handling, secret management) that does not exist in that service today. This gap was surfaced by the notifications-side analysis for spec 004.
2. **One recipient model across the system**: every other notification event already carries a server-resolved `recipients` array. The global-admin fan-out using the same shape keeps a single recipient model and reuses the proven `NotificationRecipientsService` pipeline (credential criteria + settings filter + privilege filter). The server is also where the authorization context needed to resolve admins actually lives.
3. **No new infrastructure**: no recipient-resolver capability, no authentication, no secret to provision in `alkemio-notifications`.

**Cost / accepted trade-offs**:
- **Recipient-policy changes require a server diff**: broadening the set later (e.g. admins of the subject's spaces, leads of the subject's organisations) is a server change, not a pure notifications-service policy change. Accepted — the server is where the authorization data lives.
- **Stale-recipient race**: recipients are computed at publish time and shipped inline, so the list can age slightly between publish and delivery — the same minor race the Global Role Change flow already accepts.
- **ISO 27001 trajectory**: future audit categories wanting broader recipient classes will each extend the server-side resolver rather than reuse a notifications-service policy. Accepted as bounded work.

**Rationale (general — four-event split)**:
- The existing `NotificationExternalAdapter` is the canonical entry point — already integrates with `alkemio-notifications` over RabbitMQ, already supports the typed-payload pattern.
- Four distinct events (rather than one parametrized event) keep templates simple — different recipients, different threat models, different content rules. Splitting also lets the audit table record per-channel failure distinctly (`security_signal_failed`, `new_address_notification_failed`, `global_admin_notification_failed`, `space_admin_notification_failed`).
- Masking applied at the OLD address (FR-016) is dropped for the NEW address (FR-016c, legitimate recipient) and dropped for the global-admin fan-out (FR-016d) and the per-space admin fan-out (FR-016e) — both have trusted administrator / lead recipients.

**Alternatives considered**:
- A single combined event with a `recipientType` discriminator: rejected — recipient sets / channels / content rules are too divergent.
- Inline SMTP / direct `nodemailer`: rejected (bypasses the established abstraction).
- **Delivery-time resolution in `alkemio-notifications` (server ships only the subject footprint; the notifications-service enumerates recipients)**: **rejected** — this was the original FR-016d design, reversed here. The notifications-service has no authenticated GraphQL path to read platform-admin emails, so it would require standing up service-account authentication that does not exist; it also forks the recipient model away from every other notification event. The forward-compatibility benefit (broadening recipients without a server diff) does not outweigh that cost.
- Carrying both a resolved `recipients` array AND the subject footprint as resolver input: unnecessary — recipients are resolved on the server; the footprint is retained only as optional email-display context (see the Event 3 payload above).

**Open dependency note**: This requires a coordinated bump of `@alkemio/notifications-lib` (4 new event payload classes) and 4 new templates. On the server, events 3 and 4 are wired through `NotificationRecipientsService` (reusing the Global Role Change resolver path) so each published payload carries a server-resolved `recipients` array — event 3 against the global-admin credential set, event 4 against each space's admin/lead credential set — plus a `getChannelsSettingsForEvent()` case per event. The `alkemio-notifications` service needs NO recipient-resolver capability — it consumes the recipient list like every other event. Tracked in tasks.md (T013, T014, T015, and the post-merge notification-rework task T015a). The companion notifications-side scope is `prd-notifications-email-change.md`.

---

## R9 — `client-web` deep-link URL config

**Not applicable to this spec.** This spec sends no confirmation link to a new mailbox; there is no deep link to construct. Companion spec 098 introduces the `endpoints.client_web` config key as part of its verification flow.

---

## R10 — Audit-outcome canonical enumeration

**Decision**: The `platform_audit_entry.outcome` column is typed as the cross-category Postgres native enum `platform_audit_outcome`. Initial values (the 11 outcomes created by the table-creation migration — all under `category = 'email_change'`):

`committed`, `rolled_back`, `drift_detected`, `drift_resolved`, `drift_resolution_failed`, `security_signal_failed`, `new_address_notification_failed`, `global_admin_notification_failed`, `session_invalidation_failed`, `rejected_validation`, `rejected_conflict`

Two follow-up migrations in this same feature extend the enum additively: `1779372350382-AddEmailChangeCommitStartedAuditOutcome` adds a 12th value, `commit_started` — the crash-window breadcrumb (§R15), written by the email-change category as an internal progress marker (NOT projected to the GraphQL `UserEmailChangeAuditOutcome` enum); and `1779480000000-AddEmailChangeSpaceAdminNotificationAuditOutcome` adds a 13th value, `space_admin_notification_failed` — the per-space sibling of `global_admin_notification_failed`, written when a per-space email-change fan-out (Event 4 / FR-016e) exhausts its retry budget (this one IS projected to the GraphQL enum, exactly like the other `*_notification_failed` outcomes). The email-change category therefore writes 13 outcome values; the GraphQL `UserEmailChangeAuditOutcome` projection exposes 12 of them (all but `commit_started`).

The enum is cross-category by design (Path A — see R14). Per-category outcome subsets are enforced at the service / audit-service layer, not by the DB enum: a `category = 'email_change'` row must only carry one of the 13 email-change values; a future `category = 'authentication'` row must only carry the auth-specific outcomes added by that future spec. Future categories — and companion spec 098 — extend the enum additively via `ALTER TYPE platform_audit_outcome ADD VALUE 'foo'`, which is non-breaking and requires no table migration.

**Rationale**:
- Drawn from the outcomes this spec actually writes. Companion spec 098 ADDS (additively) the verification-flow outcomes when it lands (`initiated`, `initiation_failed`, `confirmed`, `expired`, `superseded`, `rejected_used_token`, `rejected_expired_token`), still under `category = 'email_change'`.
- A Postgres native enum is preferred over varchar for both space economy and write-time validation. The cross-category shape gives DB-level enforcement of "is this string even an outcome value the platform recognises", while service-layer code does the finer "is this outcome value valid for this category" check.
- The GraphQL feature-scoped enum `UserEmailChangeAuditOutcome` (per contracts/graphql.md §1) exposes 12 of the 13 email-change outcomes — every value except the internal `commit_started` breadcrumb (§R15); the projection layer narrows the Postgres enum to the GraphQL enum when reading `category = 'email_change'` rows and filters the breadcrumb out.

**Alternatives considered**:
- One generic `rejected` outcome with the reason in a separate column: considered, but the spec's audit-query (FR-014b) requires `outcome` to be one of the enumerated values, and splitting `rejected_validation` / `rejected_conflict` makes the GraphQL enum more useful to admins.
- Per-category Postgres enums (`email_change_audit_outcome`, `authentication_audit_outcome`, …): rejected (Path A) — it forces a per-category column-type migration each time a new category lands, and it makes cross-category forensic queries on `outcome` impossible without union-of-columns gymnastics. A single cross-category enum extended additively is strictly simpler.
- `varchar(64)` with service-validated values: rejected — loses DB-level CHECK on values and the typed-column ergonomics in TypeORM, for no real flexibility gain over the additive enum.

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

## R14 — Audit storage shape: feature-scoped table vs platform-wide audit-log foundation (Path A — every typed column generic)

**Decision**: Introduce the audit table as `platform_audit_entry` — a **genuinely platform-wide audit-log foundation**. Every typed column on the row has meaning for every audit category; category-specific payload lives in a `details: jsonb` column under a documented per-category key convention. The typed columns are: `category` (enum discriminator), `subject_user_id`, `initiator_user_id`, `initiator_role` (cross-category `platform_audit_initiator_role` enum), `outcome` (cross-category `platform_audit_outcome` enum — see R10), `failure_reason`, `correlation_id`, and `details: jsonb`. There are no email-specific typed columns. The email-change feature is the FIRST consumer; future ISO 27001 categories (`authentication`, `access_control`, `data_privacy`, `configuration_change`, etc.) will be added by (a) extending the `platform_audit_category` enum additively, (b) extending the `platform_audit_outcome` enum additively with their per-category outcome values, and (c) documenting their own per-category JSONB key convention under `details`. No DDL migration is required when each new category lands.

**Rationale**:
- The team's mid-term goal is ISO 27001 certification in the next 6–12 months. ISO 27001 needs platform-wide audit-log evidence (auth events, access changes, data exports, admin operations). A genuinely generic schema lets every future category land with zero schema migration — only enum extensions (`ALTER TYPE ... ADD VALUE`, non-breaking) and code-side JSONB key conventions.
- A platform-wide audit log is also closer to what auditors actually want: a single source of truth for "who did what when" rather than N feature-specific log tables they have to correlate.
- Path A specifically (every typed column generic; category-specific payload in JSONB) was chosen over the earlier "minimal forward-compat hooks" sketch because the earlier shape kept email-specific typed columns (`old_email`, `new_email`) on a supposedly generic table. That created the worst-of-both-worlds situation: a generic table name with category-specific columns, paid for at every future category's spec by a DDL migration to add or NULL-out category-specific columns. Path A avoids that future tax entirely.
- The GraphQL surface (`platformAdmin.userEmailChangeAuditEntries`, `UserEmailChangeAuditEntry` type, etc.) is **not** generalised — it remains an email-change-feature projection over the generic table, filtered by `category = 'email_change'`. The GraphQL `oldEmail` / `newEmail` fields project from `details.oldEmail` / `details.newEmail`. Future categories introduce their own GraphQL surfaces. This keeps the public contract scoped and lets each feature own its read-side.
- The `correlation_id` column is included now (Path A addition) so that drift incidents and post-commit fan-out chains can be reconstructed without value-based joins (see R6, FR-009b).

**Alternatives considered**:
- Keep `email_change_audit_entry` feature-scoped now; introduce a sibling `platform_audit_entry` table or generalise this one when ISO 27001 work starts: rejected — doubles operational complexity (two parallel audit-log tables to keep consistent) OR forces a non-trivial table rename + data migration during ISO 27001 work.
- Hybrid: generic table name + email-specific typed columns + JSONB details (the earlier sketch): rejected (Path A) — sits awkwardly between "generic" and "feature-specific" and forces a DDL migration when category #2 lands. The current spec uses Path A end-to-end.
- Fully-generic JSONB-everywhere (no typed columns at all): rejected — loses subject/initiator FK integrity, loses DB-level enum validation on category/outcome/role, makes the FR-014b query (`WHERE subject_user_id = ?`) require JSONB filtering instead of a B-tree index.
- Defer entirely (keep feature-scoped, address ISO 27001 in a separate spec when its requirements are concrete): considered. The deciding factor is that the 6–12 month timeline is short enough that "design for it now" is not speculative — the team has clear ISO 27001 intent.

**Open dependency note**: This decision is recorded in spec.md §Clarifications Session 2026-05-19. When ISO 27001 work begins, the next spec will (a) extend the `platform_audit_category` enum additively, (b) extend the `platform_audit_outcome` enum additively with that category's outcome values, (c) document its per-category JSONB key convention under `details`, and (d) add GraphQL surfaces per category. No DB-level table rename, restructure, or column addition is anticipated.

---

## R15 — Crash-window durability: the `commit_started` breadcrumb

**Decision**: `commitAcrossSides` persists a `commit_started` audit entry **before** the forward Kratos write. A new `platform_audit_outcome` value `commit_started` is added by an additive follow-up migration. The drift-resolve lookup (`findLatestUnresolvedDriftBySubject`) is generalised to surface — in addition to an unresolved `drift_detected` row — a `commit_started` row that has no terminal row for its `correlation_id` and has not been superseded by a later `committed` / `drift_resolved` for the subject. `resolveDrift` consumes such a row unchanged: it reads both sides and aligns them to the admin-chosen canonical address.

**Problem**: §R4's Kratos-first ordering and §R5's compensating revert make the *handled* failure modes safe — a failed forward write, or a failed Alkemio write with a successful or exhausted revert. They do not cover an *unhandled* failure: the server process being terminated (k8s rolling deploy / SIGTERM mid-request, OOM-kill, pod eviction, node loss) **between** the successful Kratos write and the Alkemio write. The saga's state lives only on the call stack, so a process death there leaves Kratos holding the new address and Alkemio the old one — real drift — with no audit row, no notification, and nothing for `resolveDrift` to find (drift detection was keyed only on `drift_detected`, which is written only when the *revert* throws). That silently reintroduces the divergence the feature exists to prevent (spec.md §User Story 2) and breaks the spec's own acceptance invariant that "the audit trail captures any compensations performed" (spec.md §Assumptions).

**Rationale**:
- A breadcrumb written before the first side-write is the minimum durable state that turns a mid-commit crash from *silent* into *discoverable*. It is an ordinary append-only audit row — no `email_change_pending` entity, no lifecycle, no background reconciler — so it stays inside the spec's simplicity constraints (plan.md §Constitution Check #10).
- Winston / APM markers are insufficient: spec.md §FR-014a makes the audit table the system of record and explicitly says structured logs MUST NOT be treated as such. The breadcrumb therefore must be an audit row.
- `resolveDrift` already reads both sides and writes only where they differ, so a `commit_started` row reconciles with zero new resolution code — including the benign case (crash before the Kratos write: both sides still old) where alignment is a no-op that simply closes the breadcrumb.
- Detection is per-operation (`correlation_id`) and supersession-aware (a later `committed` / `drift_resolved` for the subject heals an earlier breadcrumb), so the common recovery path — an admin retries a crashed change and the retry commits — leaves no stale outstanding incident. Making the lookup `correlation_id`-keyed also corrected a latent recency-pairing bug in the original `drift_detected`-only query.

**Alternatives considered**:
- Persist nothing; accept the crash window as residual risk: rejected — it is the precise failure the feature exists to eliminate, and its consequence is unbounded (permanent silent drift, no notification to either address).
- An `email_change_pending` / saga-state table: rejected — heavier than a synchronous flow needs, and explicitly deferred to spec 098 (spec.md §Out of Scope). An audit row already carries everything the breadcrumb needs (`subject`, `correlation_id`, `details.oldEmail` / `details.newEmail`).
- A background reconciler sweeping for dangling breadcrumbs: rejected — FR-009a and plan.md §Constitution Check #10 forbid a background reconciler; detection stays on-demand at drift-resolve time.
- Reusing the value `initiated` (reserved by spec 098 for its self-service initiation rows): rejected — 098's `confirm` reuses `commitAcrossSides` and would then write both an `initiated` row and a second breadcrumb; a distinct `commit_started` value keeps the two unambiguous.

**Cost / accepted trade-offs**:
- A successful change writes two rows (`commit_started` then `committed`) instead of one. The breadcrumb is filtered out of the GraphQL projections (FR-014b / FR-021), so the admin-facing audit history is unchanged — the extra row is internal forensic detail.
- The breadcrumb adds one audit-table INSERT before the Kratos write — negligible against the p95 < 2 s target. If that INSERT fails the operation aborts before any side-write, which is the correct fail-safe (no safety net ⇒ do not proceed).

---

## Summary

| ID | Topic | Decision (one-liner) |
| --- | --- | --- |
| R1 | Kratos trait update API | `updateIdentity` (full replace, including `verifiable_addresses`) |
| R2 | Kratos session invalidation | `disableIdentitySessions(id)` — single call |
| R3 | Token generation | N/A in this spec — owned by 098 |
| R4 | Commit ordering | Kratos first, then Alkemio; no DB transaction — all-or-nothing delivered by the compensating Kratos revert |
| R5 | Retry & drift | 3 attempts, exp. backoff with jitter; drift on rollback exhaustion |
| R6 | Drift state | Lives on the `drift_detected` audit entry's `details.oldEmail` / `details.newEmail` JSONB keys; resolution rows share the drift's `correlation_id` (no `pending` entity in this spec) |
| R7 | Uniqueness check | `UserService.getUserByEmail` + Kratos `findIdentityByEmail`, once pre-commit; no transaction (accepted TOCTOU window; DB unique constraint is the backstop) |
| R8 | Outbound notifications | Extend `NotificationEvent` with FOUR events (OLD-address signal, NEW-address notification, global-admin fan-out, per-space admin fan-out) + reuse `NotificationExternalAdapter`; both admin fan-outs server-resolve recipients via the existing Global Role Change pattern (per-space event published once per space the subject is a member of) |
| R9 | client-web URL | N/A in this spec — owned by 098 |
| R10 | Audit outcomes | Cross-category Postgres native enum `platform_audit_outcome`; 11 initial values for the email-change subset + `commit_started` (§R15) + `space_admin_notification_failed` (FR-016e) = 13; 098 and future ISO 27001 categories extend it additively via `ALTER TYPE ... ADD VALUE` |
| R14 | Audit storage shape | `platform_audit_entry` — genuinely platform-wide audit-log foundation (Path A): every typed column generic, category-specific payload in `details: jsonb`, `correlation_id` for incident grouping; designed for ISO 27001 reuse in 6–12 months without any DDL migration |
| R11 | Masking | `${firstChar}***@${firstChar}***.${tld}` |
| R12 | Retention | Audit entries indefinite; no pending entity in this spec |
| R13 | Test strategy | Unit for service + utils; integration for end-to-end with mocked Kratos |
| R15 | Crash-window durability | `commit_started` audit breadcrumb written before the first side-write — a process death mid-commit stays discoverable and drift-resolvable; no pending entity, no reconciler |

All NEEDS CLARIFICATION items from Technical Context are resolved by spec.md §Clarifications. No open research items remain.
