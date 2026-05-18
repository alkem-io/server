---
description: 'Task list — feature 097-change-user-email (Platform Admin)'
---

# Tasks: Platform Admin Change User Login Email With Ownership Verification

**Input**: Design documents from `/specs/097-change-user-email/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/graphql.md, quickstart.md
**Companion**: `/specs/098-self-service-email-change/` — adds the `me`-shape surface on top of this foundation.

**Tests**: INCLUDED — research.md §R13 defines a Vitest unit + `*.it-spec.ts` integration plan that is part of the feature delivery (Constitution Principle 6, FR-014 / SC-004 / SC-005 require fault-injected coverage). No e2e in this iteration.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing. User stories US1–US5 in this spec map to admin-initiated, atomic-commit, token-lifecycle, validation, and audit (the original US1 / FR-001 / FR-022 / FR-022a were moved to companion spec 098 on 2026-05-18).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Maps to a user story from spec.md (US1–US5)
- All paths are repository-root-relative; the feature lives under `src/domain/community/user-email-change/` per plan.md §Project Structure
- Some task IDs (T026, T030, T032, T033, T034, T037 self-init half, T038, T043, T053) are deliberately reserved / moved to companion spec 098; gaps in the ID sequence are intentional.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project-wide config additions and shared notification-enum extensions that must exist before the domain module can wire anything up.

- [ ] T001 Add `endpoints.client_web: string` field to `AlkemioConfig` in `src/types/alkemio.config.ts` (R9 — typed config for the confirmation deep-link host)
- [ ] T002 Wire `endpoints.client_web` through the config loader chain (default in `config.yml`, env override surface in `src/config/`) — verify `ConfigService.get<EndpointsConfig>('endpoints')` (or the actual sibling-of-`hosting` path established in T001) resolves the new key (R9)
- [ ] T003 [P] Extend `NotificationEvent` enum in `src/common/enums/notification.event.ts` with `USER_EMAIL_CHANGE_CONFIRMATION` and `USER_EMAIL_CHANGE_SECURITY_SIGNAL` values (R8)
- [ ] T004 [P] Extend `NotificationEventPayload` typing in `src/common/enums/notification.event.payload.ts` with the two new payload shapes from research.md §R8 (confirmation: `recipientEmail`, `confirmationLink`, `initiatorRole`, `expiryISO8601`; security-signal: `recipientEmail`, `commitTimestampISO8601`, `initiatorRole`, `newEmailMasked`). `initiatorRole` enum is shipped with both `self` and `platform_admin` values upfront so 098 requires no migration; this spec only writes `platform_admin`.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The new domain module's enums, entities, repositories, utilities, Kratos extensions, and module wiring — everything every user story needs in place before its own surface can be implemented.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T005 [P] Create `UserEmailChangeState` enum (7 values: `INITIATED`, `CONFIRMED`, `COMMITTED`, `ROLLED_BACK`, `EXPIRED`, `SUPERSEDED`, `DRIFT_DETECTED`) in `src/domain/community/user-email-change/enums/user.email.change.state.ts` (FR-021, FR-009a)
- [ ] T006 [P] Create `UserEmailChangeAuditOutcome` enum (16 values per data-model.md §R10) in `src/domain/community/user-email-change/enums/user.email.change.audit.outcome.ts`
- [ ] T007 [P] Create `UserEmailChangeInitiatorRole` enum (`SELF`, `PLATFORM_ADMIN`) in `src/domain/community/user-email-change/enums/user.email.change.initiator.role.ts` — both values shipped upfront so spec 098 requires no enum migration; this spec only writes `PLATFORM_ADMIN` (FR-014b)
- [ ] T008 Create migration `src/migrations/<timestamp>-CreateEmailChangePendingAndAuditEntry.ts` per data-model.md §Migration Plan: 3 Postgres enum types + 2 tables (`email_change_pending`, `email_change_audit_entry`) + 4 indices on pending + 3 indices on audit + FK constraints; include reverse-direction `down()`. The `email_change_initiator_role` Postgres enum MUST include both `self` and `platform_admin` upfront.
- [ ] T009 [P] Create `IPendingUserEmailChange` interface in `src/domain/community/user-email-change/pending.user.email.change.interface.ts` mirroring the entity columns from data-model.md §Table 1
- [ ] T010 [P] Create `IUserEmailChangeAuditEntry` interface in `src/domain/community/user-email-change/user.email.change.audit.entry.interface.ts` mirroring the entity columns from data-model.md §Table 2
- [ ] T011 [P] Create `PendingUserEmailChange` TypeORM entity in `src/domain/community/user-email-change/pending.user.email.change.entity.ts` extending `BaseAlkemioEntity`; use `MID_TEXT_LENGTH` (`old_email`, `new_email`), `varchar(64)` (`token`), `SMALL_TEXT_LENGTH` (`failure_reason`), and the three new enum types (depends on T005, T007, T009)
- [ ] T012 [P] Create `UserEmailChangeAuditEntry` TypeORM entity in `src/domain/community/user-email-change/user.email.change.audit.entry.entity.ts` extending `BaseAlkemioEntity` with `@Generated('increment') rowId`; columns per data-model.md §Table 2 (depends on T006, T007, T010)
- [ ] T013 [P] Create `PendingUserEmailChangeRepository` provider in `src/domain/community/user-email-change/pending.user.email.change.repository.ts` exposing `findActiveBySubject`, `findByToken`, `transitionState`, `persistNew`, `purgeTerminalOlderThan(thresholdDate)` (depends on T011)
- [ ] T014 [P] Create `UserEmailChangeAuditEntryRepository` provider in `src/domain/community/user-email-change/user.email.change.audit.entry.repository.ts` exposing `appendEntry`, `findBySubjectPaged(cursor, limit)` (depends on T012)
- [ ] T015 [P] Create token utility `generateEmailChangeToken(): string` in `src/domain/community/user-email-change/user.email.change.token.util.ts` using `crypto.randomBytes(32).toString('base64url')` (≥256 bits, FR-007c, R3)
- [ ] T016 [P] Create masking utility `maskEmail(email: string): string` returning `${firstChar}***@${firstChar}***.${tld}` in `src/domain/community/user-email-change/user.email.change.email.masking.util.ts` (FR-016, R11)
- [ ] T017 [P] Create bounded synchronous retry helper `retryWithBackoff<T>(op, { attempts: 3, schedule: [500, 1500, 3500] })` in `src/domain/community/user-email-change/user.email.change.retry.util.ts` with jittered exponential backoff, total budget ≤10 s (FR-009, FR-009a, R5)
- [ ] T018 Extend `KratosService` in `src/services/infrastructure/kratos/kratos.service.ts` with four methods: `findIdentityByEmail(email)` (R7 — case-insensitive uniqueness lookup), `updateIdentityEmailTrait(identityId, newEmail)` (R1 — full `updateIdentity` with traits + `verifiable_addresses` marked verified per FR-011), `getIdentityEmailTrait(identityId)` (R7 — for drift-resolve current-value read), `invalidateAllIdentitySessions(identityId)` (R2 — `disableIdentitySessions`)
- [ ] T019 Create audit-write helper service `UserEmailChangeAuditService` in `src/domain/community/user-email-change/user.email.change.service.audit.ts` exposing `record(outcome, { subject, initiator, initiatorRole, oldEmail, newEmail, failureReason?, pendingChangeId? })` — internally normalises non-leaky failure reasons and never writes the token (FR-014, FR-014a, FR-014b, FR-007a) (depends on T014)
- [ ] T020 Create orchestration service skeleton `UserEmailChangeService` in `src/domain/community/user-email-change/user.email.change.service.ts` with public method stubs `initiateAdmin`, `confirm`, `resolveDrift`, `getStateForSubject` and the constructor wiring for repos + KratosService + NotificationAdapter + retry/audit/token/masking utils. (Self-service entry-point `initiateSelf` and subject-user reader `getActivePendingForSubject` are added by spec 098, which extends this same service.) Depends on T013, T014, T015, T016, T017, T018, T019.
- [ ] T021 Create `UserEmailChangeModule` in `src/domain/community/user-email-change/user.email.change.module.ts`; imports `TypeOrmModule.forFeature([PendingUserEmailChange, UserEmailChangeAuditEntry])`, `UserModule`, `KratosModule`, `NotificationAdapterModule`; providers: repositories + audit service + orchestration service; exports: orchestration service (so 098 can consume it). Depends on T020.
- [ ] T022 Add the two new notification payload publish helpers on `NotificationAdapter` (or `NotificationExternalAdapter` per project convention — see `src/services/adapters/notification-external-adapter/`): `publishEmailChangeConfirmation(payload)`, `publishEmailChangeSecuritySignal(payload)`; coordinate matching template additions in `@alkemio/notifications-lib` (R8) and bump dependency version
- [ ] T023 [P] Unit spec for token utility in `src/domain/community/user-email-change/user.email.change.token.util.spec.ts` asserting URL-safe charset, length ≥ 43, ≥128-bit entropy floor (statistical uniqueness over N=10000 samples), and that the value never encodes user/email/timestamp inputs
- [ ] T024 [P] Unit spec for masking utility in `src/domain/community/user-email-change/user.email.change.email.masking.util.spec.ts` covering normal address, single-char local, no-TLD edge case, multi-dot domain (R11)
- [ ] T025 [P] Unit spec for retry helper in `src/domain/community/user-email-change/user.email.change.retry.util.spec.ts` covering: success-on-first-attempt, success-on-third-attempt, exhaustion-after-three, total-elapsed ≤ 10 s under simulated clock (R5)

**Checkpoint**: Foundation ready — all utilities, entities, repos, Kratos extensions, module wiring, and the empty service skeleton exist. User story implementation can now begin.

---

## Phase 3: User Story 1 — Platform Admin Initiates Email Change (Priority: P1) 🎯 MVP

**Goal**: A platform admin can initiate an email change for any user via `adminUserEmailChangeBegin`, observe the outcome via the `platformAdmin.userEmailChangeState` status query, and have the action recorded with admin identity. The subject user confirms via the session-less `userEmailChangeConfirm` root mutation (its happy-path implementation lives here as it is foundational to every subsequent user story).

**Independent Test**: Run quickstart.md §Scenario 1 (steps 1.1 → 1.5). Polly (admin) initiates for Alice, Alice confirms session-lessly via the link, the old email no longer authenticates against Kratos, Alice's profile id and memberships are unchanged, and Polly's status query shows `state: COMMITTED, initiatorRole: PLATFORM_ADMIN`.

### Implementation for User Story 1

- [ ] T027 [P] [US1] Create `UserEmailChangeConfirmInput` DTO in `src/services/api/user-email-change/dto/user.email.change.confirm.dto.input.ts`
- [ ] T028 [P] [US1] Create GraphQL object type `UserEmailChangePending` (per contracts/graphql.md §2) in `src/domain/community/user-email-change/dto/user.email.change.pending.ts` — fields: `state`, `initiatorRole`, `newEmail`, `issuedAt`, `expiryAt`. (The `initiatorAdmin?` and `awaitingAdminReconciliation` fields are added by spec 098 along with the `me`-shape query that needs them.)
- [ ] T029 [P] [US1] Create GraphQL object type `UserEmailChangeConfirmResult` in `src/domain/community/user-email-change/dto/user.email.change.result.ts`
- [ ] T031 [US1] Implement `UserEmailChangeService.confirm(token)` happy-path forward-commit (Kratos→Alkemio) in `src/domain/community/user-email-change/user.email.change.service.ts`: token lookup → transition `INITIATED` → `CONFIRMED` → `updateIdentityEmailTrait` (with retry) → `user.email` write in local txn → `state=COMMITTED` → `invalidateAllIdentitySessions` → `publishEmailChangeSecuritySignal` (to old, masked) — leave compensating rollback / drift handling stubbed (covered in US2) (FR-008, FR-010, FR-011)
- [ ] T035 [US1] Create root-mutation resolver in `src/services/api/user-email-change/user.email.change.resolver.mutations.ts` exposing `userEmailChangeConfirm(userEmailChangeConfirmData: UserEmailChangeConfirmInput!): UserEmailChangeConfirmResult!` — NO `@CurrentUser` guard; resolver delegates to `UserEmailChangeService.confirm(input.token)` (FR-018a)
- [ ] T036 [US1] Register the root-mutation resolver: create `UserEmailChangeApiModule` in `src/services/api/user-email-change/user.email.change.api.module.ts`; import it into the GraphQL root module. (No `me`-shape registration in this spec — that lands in 098.)
- [ ] T039 [P] [US1] Create `AdminUserEmailChangeBeginInput` DTO with `@IsUUID() userID` + `@IsEmail() newEmail` in `src/platform-admin/domain/user/email-change/dto/admin.user.email.change.begin.dto.input.ts`
- [ ] T040 [P] [US1] Create GraphQL object type `UserEmailChangeState` (per contracts/graphql.md §2) in `src/domain/community/user-email-change/dto/user.email.change.state.ts` — fields: `state`, `initiatorRole`, `newEmail`, `issuedAt`, `expiryAt`, `confirmedAt?`, `committedAt?`, `failureReason?`
- [ ] T041 [US1] Implement `UserEmailChangeService.initiateAdmin(initiatorAdminId, subjectUserId, newEmail)` in `src/domain/community/user-email-change/user.email.change.service.ts`: load subject user, supersede prior active pending row if any, generate token, persist pending row with `state=INITIATED`, `initiatorRole=PLATFORM_ADMIN`, `initiatorUserId=initiatorAdminId`, `expiryAt=now+1h`, publish confirmation notification, return the pending row mapped to `UserEmailChangePending` (FR-002, FR-007b, FR-013, FR-019)
- [ ] T042 [US1] Implement `UserEmailChangeService.getStateForSubject(subjectUserId)` returning the most-recent pending row (active or within 30-day terminal window) mapped to `UserEmailChangeState`; returns null when no row in scope (FR-021)
- [ ] T044 [US1] Create admin mutation resolver in `src/platform-admin/domain/user/email-change/admin.user.email.change.resolver.mutations.ts` exposing `adminUserEmailChangeBegin(adminUserEmailChangeBeginData: AdminUserEmailChangeBeginInput!): UserEmailChangePending!` — enforce `grantAccessOrFail(actor, platformPolicy, PLATFORM_ADMIN)` before calling `UserEmailChangeService.initiateAdmin(currentUser.id, input.userID, input.newEmail)` (FR-002, FR-013, FR-018)
- [ ] T045 [US1] Create admin field resolver in `src/platform-admin/domain/user/email-change/admin.user.email.change.resolver.fields.ts` exposing `PlatformAdminQueryResults.userEmailChangeState(userID: UUID!): UserEmailChangeState` with PLATFORM_ADMIN authorization, delegating to `UserEmailChangeService.getStateForSubject(userID)` (FR-021)
- [ ] T046 [US1] Create `AdminUserEmailChangeModule` in `src/platform-admin/domain/user/email-change/admin.user.email.change.module.ts` importing `UserEmailChangeModule` + `AuthorizationModule`; register the admin resolvers; import the module into the platform-admin GraphQL aggregator (depends on T044, T045)
- [ ] T047 [P] [US1] Unit spec `src/platform-admin/domain/user/email-change/admin.user.email.change.resolver.mutations.spec.ts` asserting: caller-without-PLATFORM_ADMIN → throws `EMAIL_CHANGE_UNAUTHORIZED`; caller-with-PLATFORM_ADMIN → delegates to service with correct args; service's returned `UserEmailChangePending` is propagated verbatim. Parametrize the Kratos identity fixture across credential types `password-only`, `oidc-only`, `password+oidc` and assert all three reach `COMMITTED` — guards against accidental rejection of OIDC-only identities (FR-002a).
- [ ] T048 [US1] Integration spec `test/functional/integration/user-email-change-admin.it-spec.ts` covering Scenario 1 end-to-end against real Postgres + mocked Kratos HTTP: admin initiates → MailSlurper assertions (role tag = "platform admin", admin name absent per FR-003b) → Alice confirms (no session) → assert `user.email` updated + Kratos identity trait updated + `disableIdentitySessions` called + security-signal published with masked new email + Polly's `userEmailChangeState` query returns `state: COMMITTED, initiatorRole: PLATFORM_ADMIN`. Run the scenario twice with the Kratos mock identity shaped as (a) password-credential-only and (b) oidc-credential-only; both MUST reach `COMMITTED` with no path-dependent branching in the service (FR-002a).

**Checkpoint**: User Story 1 is fully functional and testable independently. Quickstart Scenario 1 passes. (The unit spec at the foundational level — covering `confirm` happy path with mocked Kratos — lives implicitly in T047's parametrized run; an isolated `confirm`-only Vitest spec is added in US2 alongside the fault-injection coverage.)

---

## Phase 4: User Story 2 — Atomic Two-Side Commit With Rollback (Priority: P1)

**Goal**: Forward-commit failures roll back atomically; rollback failures transition the pending row to `DRIFT_DETECTED` with a Winston error log + APM `captureError`, and an admin can reconcile via `adminUserEmailChangeDriftResolve`.

**Independent Test**: Run quickstart.md §Scenario 4 (fault-injected Kratos failure → ROLLED_BACK end state, both sides on old email) and Scenario 5 (double-fault → DRIFT_DETECTED → admin resolves).

### Implementation for User Story 2

- [ ] T049 [P] [US2] Create `AdminUserEmailChangeDriftResolveInput` DTO with `@IsUUID() userID` + `@IsEmail() canonicalEmail` in `src/platform-admin/domain/user/email-change/dto/admin.user.email.change.drift.resolve.dto.input.ts`
- [ ] T050 [US2] Implement the compensating-rollback branch of `UserEmailChangeService.confirm` in `src/domain/community/user-email-change/user.email.change.service.ts`: if Kratos forward write fails after `retryWithBackoff` exhaustion → transition pending to `ROLLED_BACK` (no Alkemio change had occurred — Kratos-first per R4) → throw `EMAIL_CHANGE_KRATOS_WRITE_FAILED` / `EMAIL_CHANGE_KRATOS_UNREACHABLE`; if Alkemio write fails after Kratos succeeded → revert Kratos via `updateIdentityEmailTrait(...oldEmail)` inside `retryWithBackoff` → on success transition to `ROLLED_BACK` and throw `EMAIL_CHANGE_ALKEMIO_WRITE_FAILED` (FR-009, R4, R5)
- [ ] T051 [US2] Implement the drift-detection branch in `UserEmailChangeService.confirm`: if the Kratos-revert step exhausts its retry budget → transition pending to `DRIFT_DETECTED`, set `failureReason` to a short non-leaky code (e.g., `kratos_unreachable`), emit Winston `error`-level entry tagged `email_change_drift_detected`, call `apm.captureError(error, { custom: { marker: 'email_change_drift_detected', ... } })`, throw `EMAIL_CHANGE_DRIFT_DETECTED` (FR-009a, R5)
- [ ] T052 [US2] Implement `UserEmailChangeService.resolveDrift(adminId, subjectUserId, canonicalEmail)` in `src/domain/community/user-email-change/user.email.change.service.ts`: load the DRIFT_DETECTED row (throw `EMAIL_CHANGE_NOT_FOUND` if absent); reject `canonicalEmail` not in `{old_email, new_email}` (validation error); read current Alkemio + Kratos values via `KratosService.getIdentityEmailTrait`; apply alignment writes only where the observed value differs from `canonicalEmail`, each wrapped in `retryWithBackoff`; on success append `drift_resolved` audit entry (keeping the pending row in `DRIFT_DETECTED` per FR-009b); on retry exhaustion append `drift_resolution_failed` audit and throw `EMAIL_CHANGE_DRIFT_RESOLUTION_FAILED` (FR-009b)
- [ ] T054 [US2] Create admin drift-resolve mutation in `src/platform-admin/domain/user/email-change/admin.user.email.change.resolver.mutations.ts` (extend the same resolver class from T044): `adminUserEmailChangeDriftResolve(adminUserEmailChangeDriftResolveData: AdminUserEmailChangeDriftResolveInput!): UserEmailChangeConfirmResult!` with `grantAccessOrFail(...PLATFORM_ADMIN)` (FR-009b)
- [ ] T055 [P] [US2] Unit spec `src/domain/community/user-email-change/user.email.change.service.commit.spec.ts` covering the three commit outcomes via fault injection on a mocked `KratosService`: forward-success → `COMMITTED`; forward-fail → `ROLLED_BACK`; forward-fail + rollback-fail → `DRIFT_DETECTED` with Winston + APM mocks asserted
- [ ] T056 [P] [US2] Unit spec `src/domain/community/user-email-change/user.email.change.service.drift.spec.ts` covering `resolveDrift`: not-found, invalid canonicalEmail, single-side alignment, both-sides-already-aligned (no-op success), retry exhaustion → `DRIFT_RESOLUTION_FAILED`
- [ ] T057 [US2] Integration spec `test/functional/integration/user-email-change-rollback.it-spec.ts` (Scenario 4): inject Kratos `updateIdentity` failure after retries → assert pending row = `ROLLED_BACK`, both sides reflect old email, audit entry with outcome `ROLLED_BACK`, GraphQL error code `EMAIL_CHANGE_KRATOS_WRITE_FAILED`
- [ ] T058 [US2] Integration spec `test/functional/integration/user-email-change-drift.it-spec.ts` (Scenario 5): inject BOTH forward Kratos failure AND Kratos-revert failure → assert pending row = `DRIFT_DETECTED`, audit entry with outcome `DRIFT_DETECTED`, GraphQL error `EMAIL_CHANGE_DRIFT_DETECTED`, Winston `error` + APM `captureError` invocations recorded; then call `adminUserEmailChangeDriftResolve` with `canonicalEmail = old_email` and assert both sides realign + `drift_resolved` audit entry + pending row stays `DRIFT_DETECTED` (forensic per FR-009b)

**Checkpoint**: US1+US2 functional. SC-002 / SC-004 verified by integration. The atomicity guarantee that prompted the feature is in place.

---

## Phase 5: User Story 3 — Confirmation Token Lifecycle (Priority: P2)

**Goal**: Tokens are single-use, 1-hour TTL, bound to a (user, proposed-email) pair, and invalidated on supersession. Every adversarial presentation returns the right typed error.

**Independent Test**: Run quickstart.md §Scenario 3 (steps 3.1–3.4). Reuse → `EMAIL_CHANGE_TOKEN_USED`; expiry → `EMAIL_CHANGE_TOKEN_EXPIRED`; supersession of an older token → older is rejected with `EMAIL_CHANGE_TOKEN_INVALID`; wrong-user (different session) → confirm STILL succeeds for the original subject (token is the authority, FR-018a).

### Implementation for User Story 3

- [ ] T059 [US3] Add token-lifecycle guards at the top of `UserEmailChangeService.confirm` in `src/domain/community/user-email-change/user.email.change.service.ts`. Order MUST be: (1) row not found → `EMAIL_CHANGE_TOKEN_INVALID`; (2) row state = `EXPIRED` OR (state = `INITIATED` AND `now > expiry_at`) → if still `INITIATED` transition to `EXPIRED` and append `expired` audit entry, then throw `EMAIL_CHANGE_TOKEN_EXPIRED`; (3) row state = `DRIFT_DETECTED` → throw `EMAIL_CHANGE_TOKEN_INVALID` (token cannot reactivate a drift record — admin reconciliation path via FR-009b is the only forward); (4) row state ∈ {`CONFIRMED`, `COMMITTED`, `ROLLED_BACK`, `SUPERSEDED`} → `EMAIL_CHANGE_TOKEN_USED`. The expiry branch MUST run BEFORE the "used" branch so that expired-then-swept rows still surface as `TOKEN_EXPIRED`. (FR-007(a)(b)(d), FR-015)
- [ ] T060 [US3] In `UserEmailChangeService.initiateAdmin` (and, when 098 lands, `initiateSelf`), before persisting the new pending row look up any existing active pending row for the same subject and transition it to `SUPERSEDED` (with `superseded` audit entry), then insert the new row — atomic against the partial unique index `uq_email_change_pending_active_subject` (FR-007(d), FR-019)
- [ ] T061 [US3] Add a lazy expiry sweep to the confirm token-lookup path: rows with `state='initiated' AND now() > expiry_at` are transitioned to `EXPIRED` (with `expired` audit entry) inside the same transaction as the guards in T059. The sweep MUST be performed in step (2) of T059's guard order (not before step 1) so the `TOKEN_EXPIRED` surface is preserved whether or not the daily purge has run (R12, FR-007(a)).
- [ ] T062 [P] [US3] Unit spec `src/domain/community/user-email-change/user.email.change.service.token.spec.ts` covering every adversarial rejection: unknown token, used token, expired token (mock the clock), superseded token, and the "wrong-user session" case (asserts confirmation succeeds — token authority per FR-018a)
- [ ] T063 [P] [US3] Unit spec `src/domain/community/user-email-change/user.email.change.service.supersession.spec.ts`: initiating a second admin change for an active subject transitions the prior row to `SUPERSEDED` and the prior token can no longer be confirmed
- [ ] T064 [US3] Integration spec `test/functional/integration/user-email-change-token.it-spec.ts` covering Scenario 3: reuse, expiry (fast-forward DB clock — assert error code is `EMAIL_CHANGE_TOKEN_EXPIRED`, NOT `EMAIL_CHANGE_TOKEN_USED`, even when the row's state has already been swept to `EXPIRED`), supersession, and wrong-user-confirm — each asserts the matching GraphQL error code (or, for wrong-user, the expected success surface) plus the audit-entry outcome

**Checkpoint**: Token lifecycle hardening passes SC-005 across all adversarial vectors.

---

## Phase 6: User Story 4 — Conflict and Validation Errors Before Sending Mail (Priority: P2)

**Goal**: Format / no-change / conflict errors return BEFORE any confirmation mail is sent; the same uniqueness check re-runs at confirm time; if the mail provider hard-fails after validation, the pending row is rolled back atomically.

**Independent Test**: Run quickstart.md §Scenario 2 (malformed → `EMAIL_CHANGE_VALIDATION`; current → `EMAIL_CHANGE_NO_CHANGE`; conflict → `EMAIL_CHANGE_CONFLICT` with no leak of conflict-holder) — and assert MailSlurper has zero new messages.

### Implementation for User Story 4

- [ ] T065 [US4] In `UserEmailChangeService.initiateAdmin`, add pre-mail validation pipeline in `src/domain/community/user-email-change/user.email.change.service.ts`: (a) DTO `@IsEmail()` already gives RFC 5322 basics; service throws `EMAIL_CHANGE_VALIDATION` for any residual reject; (b) compare `newEmail.toLowerCase() === subjectCurrentEmail.toLowerCase()` → throw `EMAIL_CHANGE_NO_CHANGE`; (c) Alkemio uniqueness via `LOWER(email)` query on `user`; (d) Kratos uniqueness via `KratosService.findIdentityByEmail`; either uniqueness hit → throw `EMAIL_CHANGE_CONFLICT` with a generic non-leaky message (FR-004, FR-005, FR-006, R7)
- [ ] T066 [US4] Implement FR-004a confirm-time uniqueness re-check inside `UserEmailChangeService.confirm`: BEFORE the Kratos write, repeat the Alkemio `LOWER(email)` + Kratos `findIdentityByEmail` lookups; on hit → append `rejected_conflict` audit entry, leave pending row in `INITIATED` (NOT `confirmed` — FR-004a), throw `EMAIL_CHANGE_CONFLICT`
- [ ] T067 [US4] Implement FR-019a atomic initiation: wrap the "persist pending row + publish confirmation notification" pair in `UserEmailChangeService.initiateAdmin` such that a mail-publish failure deletes the just-persisted row AND appends an `initiation_failed` audit entry (no `initiated` audit retained) AND throws `EMAIL_CHANGE_MAIL_DELIVERY_FAILED` (FR-019a)
- [ ] T068 [US4] Create central error-mapping helper in `src/domain/community/user-email-change/user.email.change.errors.ts` mapping each internal failure → `{ code: string, message: string, httpStatus: number }` per contracts/graphql.md §6; ensure `EMAIL_CHANGE_CONFLICT` constructs the same generic message regardless of which side flagged the conflict (anti-enumeration per FR-005, FR-014)
- [ ] T069 [P] [US4] Unit spec `src/domain/community/user-email-change/user.email.change.service.validation.spec.ts` covering each pre-mail rejection path and asserting no notification publish occurs in those cases
- [ ] T070 [P] [US4] Unit spec `src/domain/community/user-email-change/user.email.change.service.confirm.conflict.spec.ts` covering the FR-004a re-check rejection (Alkemio side, Kratos side, both)
- [ ] T071 [P] [US4] Unit spec `src/domain/community/user-email-change/user.email.change.service.initiation.failed.spec.ts` covering FR-019a: mail-publish failure rolls back the pending row and writes an `initiation_failed` audit entry
- [ ] T072 [US4] Integration spec `test/functional/integration/user-email-change-validation.it-spec.ts` covering Scenario 2: malformed, no-change, conflict, AND mail-publish-failure (mock the NotificationAdapter to reject) — each asserts no MailSlurper message + correct GraphQL error code + audit entry with matching `rejected_*` or `initiation_failed` outcome and non-leaky `failureReason`

**Checkpoint**: SC-006 verified — zero confirmation mails for rejected attempts. FR-019a verified at both unit and integration level.

---

## Phase 7: User Story 5 — Audit Trail of Email Changes (Priority: P3)

**Goal**: Every initiation, confirm, rejection, commit, rollback, drift, security-signal-fail, and session-invalidation-fail produces an audit entry. The admin can query the entries paginated under `platformAdmin`, with sentinel handling for unresolvable initiators.

**Independent Test**: Run quickstart.md §Scenario 6. After scenarios 1–5, the audit query for Alice returns the expected entries in descending order with `{id, displayName}` only for `initiator` / `subject`, no token, no PII leak in `failureReason`.

### Implementation for User Story 5

- [ ] T073 [US5] Add audit-entry write calls at every state transition in `UserEmailChangeService` (`src/domain/community/user-email-change/user.email.change.service.ts`): `initiated` on first persist, `confirmed` on transition, `committed` on commit, `rolled_back` on rollback, `expired` / `superseded` on those transitions, `drift_detected` on drift entry, `drift_resolved` / `drift_resolution_failed` on admin reconcile outcomes, `rejected_validation` / `rejected_conflict` / `rejected_used_token` / `rejected_expired_token` on confirm-time rejections (FR-014, FR-014a)
- [ ] T074 [US5] Add `security_signal_failed` audit-entry write in `UserEmailChangeService.confirm` post-commit branch: wrap the `publishEmailChangeSecuritySignal` call in `retryWithBackoff`; on exhaustion append the audit entry with masked old email + non-leaky failure reason, BUT do NOT trigger rollback (commit stands per FR-016b)
- [ ] T075 [US5] Add `session_invalidation_failed` audit-entry write in `UserEmailChangeService.confirm` post-commit branch: wrap `invalidateAllIdentitySessions` in `retryWithBackoff`; on exhaustion append the audit entry with non-leaky failure reason, do NOT trigger rollback (FR-017a)
- [ ] T076 [P] [US5] Create GraphQL object types `UserEmailChangeAuditEntry` and `UserEmailChangeAuditEntries` (per contracts/graphql.md §2) in `src/domain/community/user-email-change/dto/user.email.change.audit.entry.ts` — include `subject: UserProfileSummary!`, `initiator: UserProfileSummary` (nullable for sentinel), `initiatorRole`, `oldEmail?`, `newEmail?`, `outcome`, `failureReason?`, `timestamp`, plus the wrapper with `pageInfo` and `total`
- [ ] T077 [US5] Implement `UserEmailChangeService.getAuditEntriesForSubject(subjectUserId, cursorArgs)` in `src/domain/community/user-email-change/user.email.change.service.ts`: cursor-paginated query on `email_change_audit_entry` ordered by `created_date DESC`, resolves `initiator` / `subject` to `UserProfileSummary` via `UserLookupService`; when initiator cannot be resolved (early-rejection entry where `initiator_user_id IS NULL`), return `initiator: null` and rely on `initiatorRole` (FR-014b sentinel handling per data-model.md §Table 2)
- [ ] T078 [US5] Add admin field resolver method `userEmailChangeAuditEntries(userID, after, first, before, last): UserEmailChangeAuditEntries!` in `src/platform-admin/domain/user/email-change/admin.user.email.change.resolver.fields.ts` with `PLATFORM_ADMIN` auth; follow cursor pagination per `docs/Pagination.md` (FR-014b)
- [ ] T079 [P] [US5] Unit spec `src/domain/community/user-email-change/user.email.change.service.audit.spec.ts` asserting one audit entry written per state transition (parametric — iterate over every transition path), and asserting `failureReason` strings never contain the conflict-account identifier (anti-enumeration)
- [ ] T080 [US5] Integration spec `test/functional/integration/user-email-change-audit.it-spec.ts` (Scenario 6): execute a sequence that exercises every audit outcome at least once, then query `userEmailChangeAuditEntries` paginated → assert descending order, every outcome present, no token field appears in the response payload, `initiator`/`subject` carry only `{id, displayName}`, sentinel-initiator entry returns `initiator: null` with `initiatorRole` still set

**Checkpoint**: SC-003 verified — audit entry produced for every attempt. SC-009 verified — exactly one security-signal on success, zero on rejection.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Retention purge, schema baseline, validation harness, documentation, and the end-to-end quickstart walk-through.

- [ ] T081 [P] Implement daily retention purge cron in `src/domain/community/user-email-change/user.email.change.purge.cron.ts` (or co-locate with existing scheduled jobs — see `src/services/infrastructure/scheduled/` if present): invokes `PendingUserEmailChangeRepository.purgeTerminalOlderThan(now - 30d)` once per day; audit entries are NEVER purged (FR-020, FR-014a, R12)
- [ ] T082 [P] Unit spec for purge job in `src/domain/community/user-email-change/user.email.change.purge.cron.spec.ts`: terminal rows older than 30d are deleted; terminal rows younger than 30d are retained; non-terminal rows are untouched regardless of age
- [ ] T083 Regenerate GraphQL schema: `pnpm run schema:print && pnpm run schema:sort`, commit resulting `schema.graphql` — verify against contracts/graphql.md §8 expectations: additions-only (3 enums, 5 object types, 3 inputs, 3 mutations, 2 query fields), no breaking changes. (Spec 098 adds 1 more object type, 1 input, 1 mutation, 1 query field on top of this.)
- [ ] T084 Run schema diff: `pnpm run schema:diff` against `tmp/prev.schema.graphql`, review `change-report.json` — confirm zero breaking changes, zero deprecations
- [ ] T085 Run migration validation harness: `pnpm run migration:validate` (executes `.scripts/migrations/run_validate_migration.sh`) against the migration produced by T008 — verifies idempotency under snapshot/apply/CSV-diff/restore
- [ ] T086 [P] Run lint and typecheck: `pnpm lint` and `pnpm test:ci:no:coverage` — fix any Biome / `tsc --noEmit` issues introduced
- [ ] T087 Walk through the full quickstart.md end-to-end (all 6 scenarios) against a local stack started with `pnpm run start:services` + `pnpm start:dev`; check off SC-001 through SC-009 in §What success looks like

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately.
- **Phase 2 (Foundational)**: Depends on Phase 1; BLOCKS all user-story phases.
- **Phase 3 (US1 Admin)**: Depends on Phase 2. MVP-shippable on its own (sans atomicity hardening from US2 — see "MVP First" below).
- **Phase 4 (US2 Atomic)**: Depends on Phase 2 AND requires the US1 `confirm` happy-path scaffolding from T031 to extend.
- **Phase 5 (US3 Token)**: Depends on Phase 2 AND requires the US1 `confirm` body (T031) to add guards on top of.
- **Phase 6 (US4 Validation)**: Depends on Phase 2 AND requires US1 `initiateAdmin` (T041) to wrap validation/atomicity around. Confirm-time re-check (T066) requires T031 from US1.
- **Phase 7 (US5 Audit)**: Depends on Phase 2 AND benefits from every transition path from US1–US4 already existing (the audit-entry calls are sprinkled across those services).
- **Phase 8 (Polish)**: Depends on every user story phase intended for the release.

### User Story Dependencies (Implementation Coupling)

- **US1** is the trunk — its `initiateAdmin` + `confirm` skeletons in the service are where US2, US3, US4, US5 plug their logic in.
- **US2, US3, US4, US5** all extend `UserEmailChangeService` — they are sequentially mergeable into US1's trunk but cannot run in true parallel inside the same file. Plan accordingly when staffing.

### Within Each User Story

- DTOs / GraphQL object types ([P] across files) before resolvers
- Service methods before resolvers
- Resolvers before module registration
- Unit specs run in parallel with implementation
- Integration spec is the closing acceptance gate for the story

### Parallel Opportunities

- **Phase 1**: T003, T004 in parallel (different enums in different files). T001 → T002 sequential.
- **Phase 2**: T005, T006, T007 in parallel (enum files). T009, T010 in parallel (interface files). T011, T012 in parallel after their enums + interfaces are in. T013, T014 in parallel. T015, T016, T017 in parallel (independent utils). T023, T024, T025 in parallel (independent unit specs). T018 stands alone (touches `kratos.service.ts` — single-file). T019 → T020 → T021 sequential (downstream wiring).
- **US1**: T027, T028, T029, T039, T040 (DTOs / object types) in parallel. T047 in parallel with T031–T046 implementation.
- **US2**: T049 parallel with T050–T054. T055, T056 parallel.
- **US3**: T062, T063 parallel with T059–T061.
- **US4**: T069, T070, T071 parallel with T065–T068.
- **US5**: T076 parallel with T073–T075. T079 parallel with implementation.
- **Polish**: T081 + T082 parallel pair. T086 can run alongside T083–T085 once the latter complete.

---

## Implementation Strategy

### MVP First (User Story 1 + slice of User Story 2)

US1 alone is shippable but unsafe — it lacks the rollback path. The smallest production-grade slice is:

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1 (T027–T048 minus dropped IDs)
4. Complete T050–T052 from Phase 4 (US2 rollback + drift detection — atomicity is the very thing the feature exists to deliver)
5. Complete T065–T068 from Phase 6 (US4 validation/conflict — required to honour SC-006 / FR-019a)
6. **STOP and VALIDATE**: Quickstart Scenarios 1, 2, 4, 5
7. Deploy/demo

This MVP fulfils SC-001, SC-002, SC-004, SC-006, SC-007, SC-008, SC-009 — the production-grade admin-on-behalf flow.

### Incremental Delivery

1. **MVP** (above): admin-on-behalf path, atomic commit, validation, rollback, drift handling
2. **+ US3**: token-lifecycle hardening → SC-005
3. **+ US5**: audit query surface → SC-003 (most of SC-003's writes are already in MVP via US1+US2+US4; this slice adds the admin query)
4. **+ Polish (Phase 8)**: retention purge, schema baseline, full quickstart pass
5. **+ Spec 098 (self-service)**: lands on top of this foundation; adds the `me`-surface entry point and the admin-profile-summary disclosure on `me.pendingEmailChange`

### Parallel Team Strategy

With multiple developers, after Phase 2 closes:

- **Dev A**: US1 trunk (T027–T048 minus moved IDs) → US2 atomicity (T049–T058)
- **Dev B**: US3 token guards (T059–T064), stacked on top of US1 confirm body
- **Dev C**: US4 validation (T065–T072) — touches initiate body, coordinates with Dev A on `UserEmailChangeService` ownership
- **Dev D**: US5 audit query surface (T073–T080), runs once US1–US4 transitions are in
- All converge into Phase 8 for schema regeneration, migration validation, and the quickstart pass

---

## Notes

- All file paths follow plan.md §Project Structure exactly.
- `UserEmailChangeService` is the single mutation-side service file shared by US1, US2, US3, US4, US5 — these stories are sequenced inside that file. Plan code reviews to focus on this file as the integration point. Spec 098 extends the same service with `initiateSelf` and `getActivePendingForSubject`; coordinate ownership.
- The `userEmailChangeConfirm` resolver is intentionally session-less (FR-018a) — do NOT add `@CurrentUser()` decorators or `@UseGuards()` for session auth on that path; the token is the authority. This mutation is foundational and is reused unchanged by spec 098.
- Audit entries MUST NEVER contain the token (the entity has no column for it — enforce by entity shape, not by service-layer discipline).
- Every `failureReason` value written into an audit entry MUST be a short non-leaky code (e.g., `kratos_unreachable`, `conflict`, `malformed_email`); free-form messages with account-existence hints are a spec violation per FR-014.
- The three new GraphQL enums (`UserEmailChangeStateValue`, `UserEmailChangeAuditOutcome`, `UserEmailChangeInitiatorRole`) are public schema surface — once landed, additions are non-breaking but value removals require BREAKING-APPROVED. The `UserEmailChangeInitiatorRole` enum ships with both `SELF` and `PLATFORM_ADMIN` values upfront so spec 098 requires no enum extension.
- Migration T008 is single-file and idempotent — coordinate with whoever else is generating migrations in the same release to avoid timestamp collisions.
- `pnpm run schema:print && pnpm run schema:sort` MUST run before opening the PR; the schema baseline workflow handles the post-merge regeneration of `schema-baseline.graphql`.
- Stop at any phase checkpoint to validate the corresponding quickstart scenario.
- Task IDs T026, T030, T032, T033, T034, T038, T043, T053 are reserved for spec 098 (self-service) and are intentionally absent here. The gaps are documentary; do not renumber.
- Constitution alignment: this task plan honours Principles 1 (domain-centric — all logic in the new module), 3 (additive schema), 4 (explicit flow — validation → auth → domain → audit → notification → state), 6 (risk-based testing — utilities + state machine + integration), 10 (no new infra; reuses NotificationExternalAdapter / Winston / APM).
