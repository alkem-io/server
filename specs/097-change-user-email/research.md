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

**Decision**: For `drift_detected` audit entries, the `details: jsonb` column on `platform_audit_entry` carries the per-side observed values under the email-change category's documented keys: `details.oldEmail` = the value observed on the Alkemio side at the moment of drift (= the original pre-change email, since the Alkemio write never started due to Kratos-first ordering); `details.newEmail` = the value observed on the Kratos side at the moment of drift (= the attempted new email, since the Kratos write succeeded but the revert failed). The drift-resolve admin mutation reads the latest unresolved-drift audit entry (filtered to `category = 'email_change'` AND `outcome = 'drift_detected'` AND no subsequent `drift_resolved` row), validates that `canonicalEmail` is one of those two values, and applies alignment writes only where the observed value differs. The resolution row reuses the drift row's `correlation_id` so the two rows are explicitly linked (see data-model.md §Correlation semantics).

**Rationale**:
- This spec does NOT introduce a `pending` entity (no multi-step lifecycle is needed). Drift state therefore needs to live somewhere; the audit entry is the natural home — it already carries `subject_user_id`, `failure_reason`, `timestamp`, `correlation_id`, and the per-category `details` JSONB payload (which is exactly where `oldEmail` / `newEmail` belong under Path A).
- The Kratos-first commit ordering (R4) means the JSONB-key semantics are deterministic at drift time, so we don't need separate `observed_alkemio_email` / `observed_kratos_email` keys to disambiguate.
- Spec 098 introduces the `email_change_pending` entity natively as part of its verification flow; when 098 lands, drift entries can additionally carry a `details.pendingChangeId` link (no DDL change — just a new JSONB key documented by 098) but the audit-entry-as-drift-record contract from this spec continues to work unchanged.

**Alternatives considered**:
- Add a dedicated `email_change_drift` table just for drift records: rejected — needless duplication of structure already on the audit entry, plus a second table the drift-resolve admin mutation would have to consult. Audit-as-source-of-truth is simpler.
- Add `observed_alkemio_email` / `observed_kratos_email` typed columns to the audit entry: rejected — extra columns whose contents are derivable from the Kratos-first commit ordering. If the ordering ever changes (which would itself be a spec change), the audit-entry semantics would need to be re-documented anyway. Also violates the Path A principle that typed columns must be cross-category.

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

**Event 3 — `USER_EMAIL_CHANGE_GLOBAL_ADMIN_NOTIFICATION`** (fanned out by the notifications-service to a configurable administrator recipient set — minimally global platform admins, extensible downstream to admins of the subject's spaces / leads of the subject's organisations without a further server change — FR-016d):
- `subjectProfileSummary` (`{ id, displayName }`)
- `oldEmail` (full — admin recipients are trusted)
- `newEmail` (full — admin recipients are trusted)
- `initiatorProfileSummary` (`{ id, displayName }`)
- `initiatorRole`
- `commitTimestampISO8601`
- `triggerOutcome` (`COMMITTED` or `DRIFT_DETECTED` — so the template / recipient UI can render appropriate phrasing)
- `subjectMemberships` — the subject's organisational footprint at commit time, snapshot from the credential repository at publish time:
  - `spaces: [{ spaceId: UUID, level: SpaceLevel, roles: ('admin' | 'lead' | 'member')[] }]`
  - `organizations: [{ organizationId: UUID, roles: ('admin' | 'associate')[] }]`
  - Identifiers + role tags only — the membership block MUST NOT enumerate the admin / lead users of those spaces / organisations (those resolve at delivery time in the notifications-service to avoid a stale-recipient race window).
- `subjectGlobalRoles: string[]` — the subject's global role credentials beyond `GLOBAL_ADMIN` (e.g., `GLOBAL_SUPPORT`, `GLOBAL_LICENSE_MANAGER`, `BETA_TESTER`), to support policies that cross-reference (e.g., "if subject is global-support, also notify the security ops group").

**Recipient resolution model — deliberate departure from existing Global Role Change pattern**:

The existing `PLATFORM_ADMIN_GLOBAL_ROLE_CHANGED` flow resolves recipients on the server (`notification.platform.adapter.ts` calls `getNotificationRecipientsPlatform()` against credentials `[GLOBAL_ADMIN, GLOBAL_SUPPORT, GLOBAL_LICENSE_MANAGER]` filtered by `RECEIVE_NOTIFICATIONS_ADMIN`, then embeds a `recipients: UserPayload[]` array inside the published payload). The notifications-service for that flow does not rediscover recipients — it renders the template and selects per-recipient channels over the server-provided list.

FR-016d **does not follow that pattern**. Instead:
- The server publishes ONE event per triggering outcome carrying the **subject footprint** (memberships + global roles) — NOT a pre-resolved recipient list.
- The notifications-service is responsible for enumerating recipients at delivery time, applying its configured policy over the subject footprint (e.g., "global admins ∪ admins of `spaces[]` ∪ leads of `organizations[]`").
- Per-recipient channel selection (email / push / in-app) remains a notifications-service responsibility, identical to the Global Role Change flow.

**Why this departure** (rather than reusing the Global Role Change server-resolve pattern):
1. **ISO 27001 trajectory** (FR-014a Session 2026-05-19): `platform_audit_entry` is being introduced as a genuinely platform-wide audit foundation. Future audit categories (`AUTHENTICATION`, `ACCESS_CONTROL`, `DATA_PRIVACY`) will repeatedly want broader recipient classes than "global admins". A payload-carries-subject-footprint shape generalises to all of them; a payload-carries-pre-resolved-recipients shape forces every future category to re-do recipient-resolver work on the server.
2. **Recipient flexibility without server churn**: changing "who counts as an admin of this user" — adding space admins of the subject's spaces, adding org leads of the subject's orgs, restricting to a subset of global admins — becomes a pure `alkemio-notifications` policy change. No server diff, no `@alkemio/notifications-lib` bump, no audit-side `_failed` outcome semantics change.
3. **Stale-recipient race**: the existing Global Role Change pattern computes recipients at publish time and ships them inline, which means the recipient list ages between publish and delivery. Resolving at delivery time naturally tracks role-grant changes that happen during the publish/deliver window. (This was also part of the original FR-016d rationale before this revision corrected the inconsistency.)

**Cost paid for the departure**:
- The notifications-service must grow a recipient-resolver capability for this event family. It does not have one today; today it only renders + channels-out server-provided lists. For the initial cut, the resolver can hard-code "global admins only" (replicating today's behaviour); the subject-footprint fields in the payload exist so that broader policies can be added later without re-bumping `@alkemio/notifications-lib`.
- `@alkemio/notifications-lib` must define the membership + global-roles payload classes upfront, even though the initial notifications-service resolver will ignore them. This is the cost of forward-compatibility.

**Rationale (general — three-event split)**:
- The existing `NotificationExternalAdapter` is the canonical entry point — already integrates with `alkemio-notifications` over RabbitMQ, already supports the typed-payload pattern.
- Three distinct events (rather than one parametrized event) keep templates simple — different recipients, different threat models, different content rules. Splitting also lets the audit table record per-channel failure distinctly (`security_signal_failed`, `new_address_notification_failed`, `global_admin_notification_failed`).
- Masking applied at the OLD address (FR-016) is dropped for the NEW address (FR-016c, legitimate recipient) and dropped for the admin fan-out (FR-016d, trusted recipients).

**Alternatives considered**:
- A single combined event with a `recipientType` discriminator: rejected — recipient sets / channels / content rules are too divergent.
- Inline SMTP / direct `nodemailer`: rejected (bypasses the established abstraction).
- Reuse the Global Role Change pattern exactly (server pre-resolves `recipients: UserPayload[]` for FR-016d): **rejected** — locks recipient policy to a server diff for every future broadening, conflicts with the ISO 27001 audit trajectory's expected recipient diversity, and creates the stale-recipient race window noted above. The cost of departing (notifications-service grows a resolver) is paid once and pays back across all future audit categories.
- Embed the resolved admin / lead user-ids of the subject's spaces / organisations inside `subjectMemberships`: rejected — same stale-recipient race as the Global Role Change inline-recipients design, and unnecessary because the notifications-service can resolve them at delivery time from the same credential repository.

**Open dependency note**: This requires a coordinated bump of `@alkemio/notifications-lib` (3 new event payload classes, including the `subjectMemberships` + `subjectGlobalRoles` blocks on event 3), corresponding template additions (3 new templates), AND a new recipient-resolver capability in `alkemio-notifications` for event 3 (initial cut: global admins only, matching today's effective behaviour; future cuts can broaden using the subject footprint already carried in the payload). Tracked in tasks.md (T013, T014, T015).

---

## R9 — `client-web` deep-link URL config

**Not applicable to this spec.** This spec sends no confirmation link to a new mailbox; there is no deep link to construct. Companion spec 098 introduces the `endpoints.client_web` config key as part of its verification flow.

---

## R10 — Audit-outcome canonical enumeration

**Decision**: The `platform_audit_entry.outcome` column is typed as the cross-category Postgres native enum `platform_audit_outcome`. Initial values (the 11 outcomes this spec writes — all under `category = 'email_change'`):

`committed`, `rolled_back`, `drift_detected`, `drift_resolved`, `drift_resolution_failed`, `security_signal_failed`, `new_address_notification_failed`, `global_admin_notification_failed`, `session_invalidation_failed`, `rejected_validation`, `rejected_conflict`

The enum is cross-category by design (Path A — see R14). Per-category outcome subsets are enforced at the service / audit-service layer, not by the DB enum: a `category = 'email_change'` row must only carry one of the 11 values listed above; a future `category = 'authentication'` row must only carry the auth-specific outcomes added by that future spec. Future categories — and companion spec 098 — extend the enum additively via `ALTER TYPE platform_audit_outcome ADD VALUE 'foo'`, which is non-breaking and requires no table migration.

**Rationale**:
- Drawn from the outcomes this spec actually writes. Companion spec 098 ADDS (additively) the verification-flow outcomes when it lands (`initiated`, `initiation_failed`, `confirmed`, `expired`, `superseded`, `rejected_used_token`, `rejected_expired_token`), still under `category = 'email_change'`.
- A Postgres native enum is preferred over varchar for both space economy and write-time validation. The cross-category shape gives DB-level enforcement of "is this string even an outcome value the platform recognises", while service-layer code does the finer "is this outcome value valid for this category" check.
- The GraphQL feature-scoped enum `UserEmailChangeAuditOutcome` (per contracts/graphql.md §1) exposes only the 11 email-change outcomes; the projection layer narrows the Postgres enum to the GraphQL enum when reading `category = 'email_change'` rows.

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

## Summary

| ID | Topic | Decision (one-liner) |
| --- | --- | --- |
| R1 | Kratos trait update API | `updateIdentity` (full replace, including `verifiable_addresses`) |
| R2 | Kratos session invalidation | `disableIdentitySessions(id)` — single call |
| R3 | Token generation | N/A in this spec — owned by 098 |
| R4 | Commit ordering | Kratos first, then Alkemio (cheap local rollback) |
| R5 | Retry & drift | 3 attempts, exp. backoff with jitter; drift on rollback exhaustion |
| R6 | Drift state | Lives on the `drift_detected` audit entry's `details.oldEmail` / `details.newEmail` JSONB keys; resolution rows share the drift's `correlation_id` (no `pending` entity in this spec) |
| R7 | Uniqueness check | DB `LOWER()` query + Kratos `listIdentities`, once at commit time |
| R8 | Outbound notifications | Extend `NotificationEvent` with THREE events (OLD-address signal, NEW-address notification, global-admin fan-out) + reuse `NotificationExternalAdapter` (admin fan-out reuses the existing Global Role Change pattern) |
| R9 | client-web URL | N/A in this spec — owned by 098 |
| R10 | Audit outcomes | Cross-category Postgres native enum `platform_audit_outcome`; 11 initial values for the email-change subset; 098 and future ISO 27001 categories extend it additively via `ALTER TYPE ... ADD VALUE` |
| R14 | Audit storage shape | `platform_audit_entry` — genuinely platform-wide audit-log foundation (Path A): every typed column generic, category-specific payload in `details: jsonb`, `correlation_id` for incident grouping; designed for ISO 27001 reuse in 6–12 months without any DDL migration |
| R11 | Masking | `${firstChar}***@${firstChar}***.${tld}` |
| R12 | Retention | Audit entries indefinite; no pending entity in this spec |
| R13 | Test strategy | Unit for service + utils; integration for end-to-end with mocked Kratos |

All NEEDS CLARIFICATION items from Technical Context are resolved by spec.md §Clarifications. No open research items remain.
