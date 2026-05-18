---
description: 'Task list — feature 098-self-service-email-change'
---

# Tasks: Self-Service Email Change With Ownership Verification

**Input**: Design documents from `/specs/098-self-service-email-change/`
**Prerequisites**: spec.md, plan.md, research.md, data-model.md, contracts/graphql.md, **AND** the foundation contracted in `/specs/097-change-user-email/` (which MUST be merged before this spec's tasks can begin).

**Tests**: INCLUDED — research.md §R13 defines a Vitest unit + `*.it-spec.ts` integration plan that is part of the feature delivery.

**Organization**: Tasks are grouped by user story. US1 covers self-initiation + the confirm happy path. US2 covers the token lifecycle (adversarial guards + supersession + FR-019a atomic init + FR-004a confirm-time re-check). US3 covers the subject-user `me`-query and the drift-resolve extension.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Maps to a user story from spec.md (US1–US3)
- Task IDs are scoped to this spec and use the `S` prefix to distinguish from 097's `T` IDs
- All paths are repository-root-relative

---

## Phase 1: Prerequisites (Foundation from 097)

**⚠️ CRITICAL**: This phase is satisfied by the merge of spec 097. Verify before starting any S-task:

- [ ] Spec 097 has been merged.
- [ ] `email_change_audit_entry` table exists (097 T003 migration).
- [ ] `UserEmailChangeService` exists with `applyAdminEmailChange`, `resolveDrift`, `getAuditEntriesForSubject`, `getLatestAuditEntryForSubject` methods (097 T011 + later phases).
- [ ] `UserEmailChangeModule` exports `UserEmailChangeService` (097 T012).
- [ ] `email_change_initiator_role` Postgres enum already carries both `self` and `platform_admin` values (097 T003).
- [ ] `email_change_audit_outcome` Postgres enum exists with 097's 9 values.
- [ ] `KratosService` extension methods exist: `findIdentityByEmail`, `updateIdentityEmailTrait`, `getIdentityEmailTrait`, `invalidateAllIdentitySessions` (097 T009).
- [ ] `retryWithBackoff` helper exists (097 T008).
- [ ] `maskEmail` helper exists (097 T007).
- [ ] `UserEmailChangeAuditService` exists (097 T010).
- [ ] `USER_EMAIL_CHANGE_SECURITY_SIGNAL` notification event exists (097 T013) and is published post-commit by 097's `applyAdminEmailChange`. The publish helper `publishEmailChangeSecuritySignal` is on `NotificationAdapter` (097 T015).

---

## Phase 2: Foundational additions (Blocking Prerequisites for US1)

**Purpose**: Add the pending entity, token utility, new GraphQL types, new notification event, and the new config key — everything every user story needs in place before its surface can be implemented.

- [ ] S001 Add `endpoints.client_web: string` field to `AlkemioConfig` in `src/types/alkemio.config.ts` (R9)
- [ ] S002 Wire `endpoints.client_web` through the config loader chain (default in `config.yml`, env override surface in `src/config/`) — verify the new key resolves via the project's config-loader pattern (R9)
- [ ] S003 [P] Extend `NotificationEvent` enum in `src/common/enums/notification.event.ts` with `USER_EMAIL_CHANGE_CONFIRMATION` value (R8)
- [ ] S004 [P] Extend `NotificationEventPayload` typing in `src/common/enums/notification.event.payload.ts` with the confirmation payload shape (`recipientEmail`, `confirmationLink`, `initiatorRole`, `expiryISO8601`) (R8)
- [ ] S005 Add `publishEmailChangeConfirmation(payload)` helper on `NotificationAdapter` (alongside 097's `publishEmailChangeSecuritySignal`); coordinate matching template addition in `@alkemio/notifications-lib` and bump dependency version (R8)
- [ ] S006 [P] Create `UserEmailChangeState` enum (7 values: `INITIATED`, `CONFIRMED`, `COMMITTED`, `ROLLED_BACK`, `EXPIRED`, `SUPERSEDED`, `DRIFT_DETECTED`) in `src/domain/community/user-email-change/enums/user.email.change.state.ts` (FR-021)
- [ ] S007 Create migration `src/migrations/<timestamp>-CreateEmailChangePendingAndExtendAuditOutcomeEnum.ts` per data-model.md §Migration Plan: 1 new Postgres enum (`email_change_pending_state`), 7 × `ALTER TYPE email_change_audit_outcome ADD VALUE IF NOT EXISTS '...'` for the audit-outcome enum extension, 1 new table (`email_change_pending`) + 4 indices + FK constraints. Include the partial reverse-direction `down()` that drops table + pending-state enum (and leaves audit-outcome enum extensions in place — see data-model.md §Migration Plan rationale).
- [ ] S008 [P] Create `IPendingUserEmailChange` interface in `src/domain/community/user-email-change/pending.user.email.change.interface.ts` mirroring the entity columns from data-model.md §Table 1
- [ ] S009 [P] Create `PendingUserEmailChange` TypeORM entity in `src/domain/community/user-email-change/pending.user.email.change.entity.ts` extending `BaseAlkemioEntity`; columns per data-model.md §Table 1 (depends on S006, S008)
- [ ] S010 Create `PendingUserEmailChangeRepository` provider in `src/domain/community/user-email-change/pending.user.email.change.repository.ts` exposing `findActiveBySubject`, `findByToken`, `transitionState`, `persistNew`, `purgeTerminalOlderThan(thresholdDate)` (depends on S009)
- [ ] S011 [P] Create token utility `generateEmailChangeToken(): string` in `src/domain/community/user-email-change/user.email.change.token.util.ts` using `crypto.randomBytes(32).toString('base64url')` (≥256 bits, FR-007c, R3)
- [ ] S012 [P] Unit spec for token utility in `src/domain/community/user-email-change/user.email.change.token.util.spec.ts` asserting URL-safe charset, length ≥ 43, ≥128-bit entropy floor (statistical uniqueness over N=10000 samples), and that the value never encodes user/email/timestamp inputs
- [ ] S013 Extend `UserEmailChangeModule` in `src/domain/community/user-email-change/user.email.change.module.ts` to add `PendingUserEmailChange` to the `TypeOrmModule.forFeature(...)` array and to register `PendingUserEmailChangeRepository` as a provider (depends on S009, S010)
- [ ] S014 [P] Create GraphQL object type `UserEmailChangePending` (per contracts/graphql.md §2) in `src/domain/community/user-email-change/dto/user.email.change.pending.ts` — fields: `state`, `initiatorRole`, `newEmail`, `issuedAt`, `expiryAt`, `awaitingAdminReconciliation`. Always `initiatorRole: SELF` for rows persisted by this spec.
- [ ] S015 [P] Create GraphQL object type `UserEmailChangeConfirmResult` in `src/domain/community/user-email-change/dto/user.email.change.confirm.result.ts` per contracts/graphql.md §2

**Checkpoint**: Foundation extended — pending entity, token util, new GraphQL types, new notification event, new config key all in place. Service-method work can begin.

---

## Phase 3: User Story 1 — User Initiates Self-Service Email Change With Verification (Priority: P1) 🎯 MVP

**Goal**: A logged-in user can initiate an email change via `meUserEmailChangeBegin`, receive a confirmation message at the new mailbox, confirm via the session-less `userEmailChangeConfirm` root mutation, and end up logged in only with the new address.

**Independent Test**: Run quickstart.md §Scenario 1 end-to-end. Alice initiates, MailSlurper shows the confirmation with role tag `self`, Alice confirms session-lessly, the old email no longer authenticates against Kratos, her profile id and memberships are unchanged.

### Implementation for User Story 1

- [ ] S016 [P] [US1] Create `MeUserEmailChangeBeginInput` DTO with `@IsEmail()`-validated `newEmail` in `src/services/api/me/email-change/dto/me.user.email.change.begin.dto.input.ts`
- [ ] S017 [P] [US1] Create `UserEmailChangeConfirmInput` DTO with `@IsString()` `token` in `src/services/api/user-email-change/dto/user.email.change.confirm.dto.input.ts`
- [ ] S018 [US1] Add `initiateSelf(subjectUserId, newEmail)` method to `UserEmailChangeService` in `src/domain/community/user-email-change/user.email.change.service.ts`. Body: load current user (throw `EMAIL_CHANGE_SUBJECT_NOT_FOUND` if missing) → run validation pipeline (format already via DTO; `EMAIL_CHANGE_NO_CHANGE` if equal to current; `EMAIL_CHANGE_CONFLICT` if uniqueness hit on either side, with `rejected_*` audit entry) → supersede any prior active pending row (transition to `SUPERSEDED`, write `superseded` audit entry) → generate token → persist pending row with `state=INITIATED`, `initiatorRole=SELF`, `initiatorUserId=subjectUserId`, `expiryAt=now+1h` → publish `USER_EMAIL_CHANGE_CONFIRMATION` event (wrapped in `retryWithBackoff` per FR-019a atomicity — see S019). On success write `initiated` audit entry. Return the pending row mapped to `UserEmailChangePending`. (FR-001, FR-001a, FR-001b, FR-007b, FR-019)
- [ ] S019 [US1] Wrap the "persist pending row + publish confirmation event" pair in S018 such that a mail-publish failure (mock the NotificationAdapter to reject) deletes the just-persisted row, writes an `initiation_failed` audit entry (no `initiated` audit retained), and throws `EMAIL_CHANGE_MAIL_DELIVERY_FAILED` (FR-019a)
- [ ] S020 [US1] Add `confirm(token)` method to `UserEmailChangeService`. Body (happy path): token lookup (lifecycle guards in S025 are stacked on top) → FR-004a confirm-time uniqueness re-check (Alkemio `LOWER(email)` + Kratos `findIdentityByEmail`); on hit → write `rejected_conflict` audit entry, leave pending row in `INITIATED`, throw `EMAIL_CHANGE_CONFLICT` → transition pending row to `CONFIRMED`, write `confirmed` audit entry → CALL THE EXISTING 097 commit logic (`applyAdminEmailChange`'s Kratos-then-Alkemio body — refactored into a private `commitAcrossSides(subject, oldEmail, newEmail)` helper if necessary) → on success transition pending row to `COMMITTED`, set `committed_at`, write `committed` audit entry → 097's existing post-commit security-signal + session-invalidation paths run unchanged. Return `UserEmailChangeConfirmResult { success: true, email: newEmail }`. (FR-004a, FR-008, FR-018a — also inherits 097's FR-009 / FR-010 / FR-011 / FR-016 / FR-017)
- [ ] S021 [US1] Create me-shape mutation resolver in `src/services/api/me/email-change/me.user.email.change.resolver.mutations.ts` exposing `meUserEmailChangeBegin(meUserEmailChangeBeginData: MeUserEmailChangeBeginInput!): UserEmailChangePending!`; resolver delegates to `UserEmailChangeService.initiateSelf(currentUser.id, input.newEmail)`. No `userID` argument; subject is always the caller. (FR-001, FR-013)
- [ ] S022 [US1] Create root-mutation resolver in `src/services/api/user-email-change/user.email.change.resolver.mutations.ts` exposing `userEmailChangeConfirm(userEmailChangeConfirmData: UserEmailChangeConfirmInput!): UserEmailChangeConfirmResult!` — NO `@CurrentUser` guard; resolver delegates to `UserEmailChangeService.confirm(input.token)` (FR-018a)
- [ ] S023 [US1] Register the new resolvers in their owning module files: create `MeUserEmailChangeApiModule` at `src/services/api/me/email-change/me.user.email.change.api.module.ts` importing `UserEmailChangeModule` + `AuthorizationModule`; create `UserEmailChangeApiModule` at `src/services/api/user-email-change/user.email.change.api.module.ts` importing `UserEmailChangeModule`; import both into the GraphQL root module (depends on S021, S022)
- [ ] S024 [P] [US1] Integration spec `test/functional/integration/user-email-change-self.it-spec.ts` covering self-service end-to-end against real Postgres + mocked Kratos HTTP: Alice authenticates → initiates → MailSlurper assertion (role tag = `self`, confirmation link present, no admin profile in message per FR-003b) → confirms session-lessly via root mutation → asserts `user.email` updated + Kratos identity trait updated (with `verifiable_addresses` verified per 097's FR-011) + `disableIdentitySessions` called + security-signal published with masked new email and role tag `self`. Run twice with the Kratos mock identity shaped as (a) password-only and (b) oidc-only (FR-001a).

**Checkpoint**: User Story 1 functional. SC-001 verified.

---

## Phase 4: User Story 2 — Confirmation Token Lifecycle (Priority: P2)

**Goal**: Token guards reject every adversarial presentation with the right typed error. FR-019a atomic-init guarantee is verified at unit AND integration level.

**Independent Test**: Run quickstart.md §Scenario 2. Reuse → `EMAIL_CHANGE_TOKEN_USED`; expiry → `EMAIL_CHANGE_TOKEN_EXPIRED` (even after lazy sweep); supersession → `EMAIL_CHANGE_TOKEN_INVALID`; wrong-user-session-confirm → succeeds (FR-018a).

### Implementation for User Story 2

- [ ] S025 [US2] Add token-lifecycle guards at the top of `UserEmailChangeService.confirm` in `src/domain/community/user-email-change/user.email.change.service.ts`. Order MUST be: (1) row not found → `EMAIL_CHANGE_TOKEN_INVALID`; (2) row state = `EXPIRED` OR (state = `INITIATED` AND `now > expiry_at`) → if still `INITIATED` transition to `EXPIRED` and append `expired` audit entry, then throw `EMAIL_CHANGE_TOKEN_EXPIRED`; (3) row state = `DRIFT_DETECTED` → throw `EMAIL_CHANGE_TOKEN_INVALID` (token cannot reactivate a drift record); (4) row state ∈ {`CONFIRMED`, `COMMITTED`, `ROLLED_BACK`, `SUPERSEDED`} → write `rejected_used_token` audit entry, throw `EMAIL_CHANGE_TOKEN_USED`. The expiry branch MUST run BEFORE the "used" branch so expired-then-swept rows still surface as `TOKEN_EXPIRED`. (FR-007(a)(b)(d), FR-018a)
- [ ] S026 [US2] Add a lazy expiry sweep step inside `UserEmailChangeService.confirm` immediately after the token lookup but before the state-check fan-out from S025: rows with `state='initiated' AND now() > expiry_at` are transitioned to `EXPIRED` (with `expired` audit entry) inside the same transaction. The sweep makes the `EMAIL_CHANGE_TOKEN_EXPIRED` error surface deterministic regardless of whether the daily purge has run (R12)
- [ ] S027 [P] [US2] Unit spec `src/domain/community/user-email-change/user.email.change.service.token.spec.ts` covering every adversarial token-presentation rejection: unknown token, used token (state=COMMITTED), used token (state=CONFIRMED — in-flight), expired token via direct EXPIRED state, expired token via lazy sweep on INITIATED+overdue, superseded token, drift-detected token. The "wrong-user session" case (token presented while logged in as a different user, or with no session) MUST succeed — assert the confirm proceeds and returns `success: true` for the original subject (FR-018a)
- [ ] S028 [P] [US2] Unit spec `src/domain/community/user-email-change/user.email.change.service.supersession.spec.ts`: initiating a second change for an active subject transitions the prior row to `SUPERSEDED` (with audit entry) and the prior token can no longer be confirmed
- [ ] S029 [P] [US2] Unit spec `src/domain/community/user-email-change/user.email.change.service.initiation.failed.spec.ts` covering FR-019a: mail-publish failure rolls back the pending row (no row remains) AND writes an `initiation_failed` audit entry AND throws `EMAIL_CHANGE_MAIL_DELIVERY_FAILED`
- [ ] S030 [P] [US2] Unit spec `src/domain/community/user-email-change/user.email.change.service.confirm.conflict.spec.ts` covering FR-004a confirm-time uniqueness re-check (Alkemio side, Kratos side, both) — rejected_conflict audit entry written, pending row stays in `INITIATED` (does NOT transition to `confirmed`)
- [ ] S031 [US2] Integration spec `test/functional/integration/user-email-change-token.it-spec.ts` covering Scenario 2: reuse, expiry (fast-forward DB clock — assert error code is `EMAIL_CHANGE_TOKEN_EXPIRED`, NOT `EMAIL_CHANGE_TOKEN_USED`, even when the row's state has already been swept to `EXPIRED`), supersession, wrong-user-confirm (succeeds), FR-019a mail-send failure (assert no row remains + `initiation_failed` audit entry + `EMAIL_CHANGE_MAIL_DELIVERY_FAILED`)

**Checkpoint**: User Story 2 functional. SC-005, SC-006, SC-007, SC-008 verified.

---

## Phase 5: User Story 3 — Subject-User Read Query + Drift-Resolve Extension (Priority: P2)

**Goal**: Subject user can read their own active pending change. Drift-resolve mutation (097) is extended to transition the associated pending row when one exists.

**Independent Test**: 
1. Alice self-initiates → Alice queries `me.pendingEmailChange` → sees `state: INITIATED, initiatorRole: SELF, newEmail, issuedAt, expiryAt, awaitingAdminReconciliation: false`.
2. Bob queries with no pending change → null.
3. Inject DRIFT_DETECTED on Alice's pending row → Alice queries → `awaitingAdminReconciliation: true`; no per-side observed values.
4. Polly resolves drift with canonical = new_email → Alice's pending row transitions to COMMITTED.

### Implementation for User Story 3

- [ ] S032 [US3] Add `getActivePendingForSubject(subjectUserId)` method to `UserEmailChangeService` in `src/domain/community/user-email-change/user.email.change.service.ts`: returns the row in state INITIATED, CONFIRMED, or (DRIFT_DETECTED within 30-day FR-020 window) mapped to `UserEmailChangePending`; returns null otherwise. The mapper MUST set `awaitingAdminReconciliation: true` iff `state === DRIFT_DETECTED` and MUST NOT expose per-side observed email values or technical failure reasons (FR-022, FR-022a)
- [ ] S033 [US3] Create me-shape field resolver in `src/services/api/me/email-change/me.user.email.change.resolver.fields.ts` exposing `MeQueryResults.pendingEmailChange: UserEmailChangePending` returning `UserEmailChangeService.getActivePendingForSubject(currentUser.id)`. The resolver MUST NOT accept a `userID` argument; subject is always the caller (FR-022)
- [ ] S034 [US3] Register the field resolver in the `MeUserEmailChangeApiModule` (extend S023)
- [ ] S035 [US3] Extend `UserEmailChangeService.resolveDrift` (097) in `src/domain/community/user-email-change/user.email.change.service.ts` to ALSO transition the associated `email_change_pending` row (when one exists) on successful resolution: lookup pending row by subject in state `DRIFT_DETECTED`; if present and `canonicalEmail === pending.new_email` → transition to `COMMITTED` (set `committed_at`); if present and `canonicalEmail === pending.old_email` → transition to `ROLLED_BACK`. If no pending row is associated (097's admin-on-behalf synchronous flow case), behaviour is unchanged. The `drift_detected` and `drift_resolved` audit entries remain immutable (097's FR-009b and FR-014a unchanged). (FR-009b-EXT)
- [ ] S036 [P] [US3] Unit spec `src/domain/community/user-email-change/user.email.change.service.get.active.pending.spec.ts` covering `getActivePendingForSubject` across every observable state: INITIATED (returns row, `awaitingAdminReconciliation: false`), CONFIRMED (returns row), COMMITTED (returns null), ROLLED_BACK / EXPIRED / SUPERSEDED (returns null), DRIFT_DETECTED within 30-day window (returns row with `awaitingAdminReconciliation: true` and no diagnostic fields), DRIFT_DETECTED past 30-day window (returns null), SELF-initiated row (returns row), PLATFORM_ADMIN-initiated row (would also return — but in practice this case doesn't arise because 097 commits synchronously without a pending row).
- [ ] S037 [P] [US3] Unit spec `src/services/api/me/email-change/me.user.email.change.resolver.fields.spec.ts` asserting: caller-subject equality is enforced (resolver always uses `currentUser.id`, never an input-supplied id); when the service returns a pending row, the resolver propagates it verbatim.
- [ ] S038 [P] [US3] Unit spec `src/domain/community/user-email-change/user.email.change.service.drift.resolve.extension.spec.ts` covering S035: no-pending-row case (097's behaviour unchanged); pending-row + canonical = new_email → pending state `COMMITTED` + `committed_at` set; pending-row + canonical = old_email → pending state `ROLLED_BACK`; pending-row + canonical = some other value → reject (097's drift-resolve validation rejects this before reaching the pending-row transition).
- [ ] S039 [US3] Integration spec `test/functional/integration/user-email-change-me-query.it-spec.ts`: Scenario (a) Alice self-initiates → Alice queries `me.pendingEmailChange` → asserts `initiatorRole: SELF` + `awaitingAdminReconciliation: false`; Scenario (b) Bob queries with no pending change → null; Scenario (c) inject DRIFT_DETECTED on Alice's record → Alice queries → asserts the record is returned with `awaitingAdminReconciliation: true` and no per-side diagnostic fields visible; Scenario (d) Polly (admin) invokes `adminUserEmailChangeDriftResolve` with `canonicalEmail = new_email` → assert Alice's pending row transitions to `COMMITTED` AND a `drift_resolved` audit entry is written (FR-022, FR-022a, FR-009b-EXT, SC-003, SC-004)

**Checkpoint**: User Story 3 functional. SC-003, SC-004 verified.

---

## Phase 6: Polish

- [ ] S040 [P] Implement daily retention purge for `email_change_pending` rows: invoke `PendingUserEmailChangeRepository.purgeTerminalOlderThan(now - 30d)` once per day (R12). Co-locate with 097's scheduled jobs surface (`src/services/infrastructure/scheduled/` or equivalent). Audit entries are NEVER purged.
- [ ] S041 [P] Unit spec for purge job: terminal rows older than 30d are deleted; terminal rows younger than 30d are retained; non-terminal rows are untouched regardless of age.
- [ ] S042 Regenerate GraphQL schema: `pnpm run schema:print && pnpm run schema:sort`, commit resulting `schema.graphql`. Expected delta vs the post-097 baseline: 1 new enum (`UserEmailChangeStateValue`), 7 additive values on the existing `UserEmailChangeAuditOutcome` enum, 2 new object types, 2 new inputs, 2 new mutations, 1 new query field.
- [ ] S043 Run schema diff: `pnpm run schema:diff` against the post-097 baseline, review `change-report.json` — confirm zero breaking changes, zero deprecations.
- [ ] S044 Run migration validation harness: `pnpm run migration:validate` against the migration produced by S007 — verifies idempotency under snapshot/apply/CSV-diff/restore.
- [ ] S045 [P] Run lint and typecheck: `pnpm lint` and `pnpm test:ci:no:coverage`.
- [ ] S046 Walk through quickstart.md end-to-end against a local stack started with `pnpm run start:services` + `pnpm start:dev`; check off SC-001 through SC-008.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Prerequisites)**: satisfied by the merge of 097.
- **Phase 2 (Foundational additions)**: depends on Phase 1; BLOCKS all user-story phases.
- **Phase 3 (US1 Initiate + Confirm)**: depends on Phase 2.
- **Phase 4 (US2 Token Lifecycle)**: depends on Phase 3 — guards stack on top of S020's confirm body; FR-019a wraps S018's initiate atomicity; FR-004a wraps S020's confirm pre-commit.
- **Phase 5 (US3 me-query + drift-resolve extension)**: depends on Phase 3 (S014 GraphQL type exists) and on the drift_detected pending row being writable (S020 + S025 from Phase 4 are not strictly required — drift_detected entry could be injected by test harness — but in practice US3's integration tests run after Phase 4).
- **Phase 6 (Polish)**: depends on every user story phase intended for the release.

### Parallel Opportunities

- **Phase 2**: S001 → S002 sequential. S003 + S004 [P], S005 sequential after. S006 [P] alongside S001/S003. S008 [P] alongside S006. S009 sequential after S006 + S008. S010 sequential after S009. S011 + S012 [P]. S014, S015 [P]. S013 sequential after S009 + S010.
- **US1**: S016, S017 [P]. S018 → S019 sequential (S019 wraps S018's atomicity). S020 sequential after S018. S021 sequential after S018. S022 sequential after S020. S023 sequential after S021 + S022. S024 [P] alongside S018–S023 implementation.
- **US2**: S025, S026 sequential (S026 must run after S025 inside the same transaction). S027, S028, S029, S030 [P] alongside S025/S026.
- **US3**: S032 → S033 → S034 sequential. S035 [P] with S032. S036, S037, S038 [P] alongside the implementations.
- **Polish**: S040 + S041 [P]. S045 [P] alongside S042–S044 once they complete.

---

## Notes

- All file paths follow plan.md §Project Structure exactly.
- `UserEmailChangeService` is shared with 097 — coordinate code review on this file with 097's owners. This spec adds three new methods (`initiateSelf`, `confirm`, `getActivePendingForSubject`) and extends `resolveDrift`.
- The `userEmailChangeConfirm` resolver MUST be session-less (FR-018a) — do NOT add `@CurrentUser()` decorators or `@UseGuards()` for session auth on that path; the token is the authority.
- The `meUserEmailChangeBegin` resolver MUST always use `currentUser.id` as the subject; do NOT accept a `userID` argument from input.
- The `me.pendingEmailChange` resolver MUST refuse any input-supplied user identifier. Subject is always `currentUser.id`.
- Audit entries MUST NEVER contain the token (enforced by the audit entity having no `token` column).
- Every `failureReason` value MUST be a short non-leaky code (e.g., `mail_send_failed`, `conflict`, `kratos_unreachable`).
- The new pending-state enum (`UserEmailChangeStateValue`) and the 7 additive audit-outcome values are public schema surface — once landed, additions are non-breaking but value removals require BREAKING-APPROVED.
- Schema baseline regeneration handled by the post-merge `schema-baseline.yml` workflow per CLAUDE.md.
- Constitution alignment: this task plan honours Principles 1 (extends in place), 3 (additive schema), 4 (explicit flow — validation → auth → domain → audit → notification → state), 6 (risk-based testing — every adversarial token branch + FR-004a + FR-019a), 8 (token never logged; me-query keyed to caller), 10 (no new infra; reuses 097's foundation).
