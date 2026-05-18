---
description: 'Task list — feature 097-change-user-email (Platform Admin, No Verification)'
---

# Tasks: Platform Admin Change User Login Email (No Verification)

**Input**: Design documents from `/specs/097-change-user-email/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/graphql.md, quickstart.md
**Companion**: `/specs/098-self-service-email-change/` — adds the platform-mediated email-ownership verification surface on top of this audit foundation.

**Tests**: INCLUDED — research.md §R13 defines a Vitest unit + `*.it-spec.ts` integration plan that is part of the feature delivery (Constitution Principle 6; FR-014 / SC-004 / SC-005 require fault-injected coverage). No e2e in this iteration.

**Organization**: Tasks are grouped by user story. US1 = the synchronous admin-on-behalf change. US2 = atomicity / drift handling. US3 = validation. US4 = audit query.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Maps to a user story from spec.md (US1–US4)
- All paths are repository-root-relative; the feature lives under `src/domain/community/user-email-change/` per plan.md §Project Structure

---

## Phase 1: Foundational (Blocking Prerequisites)

**Purpose**: The new domain module's enums, entity, repository, utilities, Kratos extensions, and module wiring — everything every user story needs in place.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T001 [P] Create `UserEmailChangeAuditOutcome` enum (9 values per data-model.md §1) in `src/domain/community/user-email-change/enums/user.email.change.audit.outcome.ts`
- [ ] T002 [P] Create `UserEmailChangeInitiatorRole` enum (`SELF`, `PLATFORM_ADMIN`) in `src/domain/community/user-email-change/enums/user.email.change.initiator.role.ts` — both values shipped upfront for 098 forward-compat (FR-014b)
- [ ] T003 Create migration `src/migrations/<timestamp>-CreateEmailChangeAuditEntry.ts` per data-model.md §Migration Plan: 2 Postgres enum types + 1 table (`email_change_audit_entry`) + 3 indices + FK constraints; include reverse-direction `down()`
- [ ] T004 [P] Create `IUserEmailChangeAuditEntry` interface in `src/domain/community/user-email-change/user.email.change.audit.entry.interface.ts` mirroring the entity columns from data-model.md §Table 1
- [ ] T005 [P] Create `UserEmailChangeAuditEntry` TypeORM entity in `src/domain/community/user-email-change/user.email.change.audit.entry.entity.ts` extending `BaseAlkemioEntity` with `@Generated('increment') rowId`; columns per data-model.md §Table 1 (depends on T001, T002, T004)
- [ ] T006 [P] Create `UserEmailChangeAuditEntryRepository` provider in `src/domain/community/user-email-change/user.email.change.audit.entry.repository.ts` exposing `appendEntry`, `findBySubjectPaged(cursor, limit)`, `findLatestBySubject(subjectUserId)` (depends on T005)
- [ ] T007 [P] Create masking utility `maskEmail(email: string): string` returning `${firstChar}***@${firstChar}***.${tld}` in `src/domain/community/user-email-change/user.email.change.email.masking.util.ts` (FR-016, R11)
- [ ] T008 [P] Create bounded synchronous retry helper `retryWithBackoff<T>(op, { attempts: 3, schedule: [500, 1500, 3500] })` in `src/domain/community/user-email-change/user.email.change.retry.util.ts` with jittered exponential backoff, total budget ≤10 s (FR-009, FR-009a, R5)
- [ ] T009 Extend `KratosService` in `src/services/infrastructure/kratos/kratos.service.ts` with four methods: `findIdentityByEmail(email)` (R7 — case-insensitive uniqueness lookup), `updateIdentityEmailTrait(identityId, newEmail)` (R1 — full `updateIdentity` with traits + `verifiable_addresses` marked verified per FR-011), `getIdentityEmailTrait(identityId)` (R7 — for drift-resolve current-value read), `invalidateAllIdentitySessions(identityId)` (R2 — `disableIdentitySessions`)
- [ ] T010 Create audit-write helper service `UserEmailChangeAuditService` in `src/domain/community/user-email-change/user.email.change.service.audit.ts` exposing `record(outcome, { subject, initiator, initiatorRole, oldEmail, newEmail, failureReason? })` — internally normalises non-leaky failure reasons (FR-014, FR-014a) (depends on T006)
- [ ] T011 Create orchestration service skeleton `UserEmailChangeService` in `src/domain/community/user-email-change/user.email.change.service.ts` with public method stubs `applyAdminEmailChange`, `resolveDrift`, `getAuditEntriesForSubject`, `getLatestAuditEntryForSubject` and the constructor wiring for repository + KratosService + NotificationAdapter + retry/audit/masking utils. (Companion spec 098 will extend this same service with `initiateSelf`, `confirm`, and `getActivePendingForSubject` methods.) Depends on T006, T007, T008, T009, T010.
- [ ] T012 Create `UserEmailChangeModule` in `src/domain/community/user-email-change/user.email.change.module.ts`; imports `TypeOrmModule.forFeature([UserEmailChangeAuditEntry])`, `UserModule`, `KratosModule`, `NotificationAdapterModule`; providers: repository + audit service + orchestration service; exports: orchestration service (so 098 can consume and extend it). Depends on T011.
- [ ] T013 Extend `NotificationEvent` enum in `src/common/enums/notification.event.ts` with `USER_EMAIL_CHANGE_SECURITY_SIGNAL` value (R8). The `USER_EMAIL_CHANGE_CONFIRMATION` event introduced by spec 098 is NOT added here.
- [ ] T014 Extend `NotificationEventPayload` typing in `src/common/enums/notification.event.payload.ts` with the security-signal payload shape (`recipientEmail`, `commitTimestampISO8601`, `initiatorRole`, `newEmailMasked`)
- [ ] T015 Add the security-signal publish helper on `NotificationAdapter` (or `NotificationExternalAdapter` per project convention): `publishEmailChangeSecuritySignal(payload)`; coordinate matching template addition in `@alkemio/notifications-lib` and bump dependency version
- [ ] T016 [P] Unit spec for masking utility in `src/domain/community/user-email-change/user.email.change.email.masking.util.spec.ts` covering normal address, single-char local, no-TLD edge case, multi-dot domain (R11)
- [ ] T017 [P] Unit spec for retry helper in `src/domain/community/user-email-change/user.email.change.retry.util.spec.ts` covering: success-on-first-attempt, success-on-third-attempt, exhaustion-after-three, total-elapsed ≤ 10 s under simulated clock (R5)

**Checkpoint**: Foundation ready — all utilities, entity, repository, Kratos extensions, module wiring, and the empty service skeleton exist. User story implementation can now begin.

---

## Phase 2: User Story 1 — Platform Admin Synchronously Changes a User's Email (Priority: P1) 🎯 MVP

**Goal**: A platform admin invokes `adminUserEmailChange` and the change commits synchronously across Kratos and Alkemio, with sessions invalidated and a security-signal sent to the old address. No confirmation message, no token, no pending state.

**Independent Test**: Run quickstart.md §Scenario 1. Polly (admin) invokes the mutation for Alice. The change commits in one call. Alice can immediately log in with the new email; the old email is rejected. MailSlurper shows exactly one message at Alice's OLD address (the security signal). The audit log has one `committed` entry.

### Implementation for User Story 1

- [ ] T018 [P] [US1] Create `AdminUserEmailChangeInput` DTO with `@IsUUID() userID` + `@IsEmail() newEmail` in `src/platform-admin/domain/user/email-change/dto/admin.user.email.change.dto.input.ts`
- [ ] T019 [P] [US1] Create GraphQL object type `UserEmailChangeResult` in `src/domain/community/user-email-change/dto/user.email.change.result.ts` per contracts/graphql.md §2 (`success: Boolean!`, `email: String`)
- [ ] T020 [US1] Implement `UserEmailChangeService.applyAdminEmailChange(initiatorAdminId, subjectUserId, newEmail)` in `src/domain/community/user-email-change/user.email.change.service.ts` — happy-path body: load subject user (throw `EMAIL_CHANGE_SUBJECT_NOT_FOUND` if missing) → validate (format already covered by DTO; check no-change against current; check uniqueness on Alkemio + Kratos) → write Kratos with `retryWithBackoff` → write `user.email` in a local TypeORM txn → append `committed` audit entry → invalidate Kratos sessions (wrapped in `retryWithBackoff`; failure → write `session_invalidation_failed` audit entry, but commit stands) → publish `publishEmailChangeSecuritySignal` with masked new email (wrapped in `retryWithBackoff`; failure → write `security_signal_failed` audit entry, but commit stands) → return `{ success: true, email: newEmail }`. Leave compensating rollback / drift handling stubbed (covered in US2). (FR-002, FR-002a, FR-004, FR-005, FR-006, FR-010, FR-011, FR-016, FR-016a, FR-016b, FR-017, FR-017a)
- [ ] T021 [US1] Create admin mutation resolver in `src/platform-admin/domain/user/email-change/admin.user.email.change.resolver.mutations.ts` exposing `adminUserEmailChange(adminUserEmailChangeData: AdminUserEmailChangeInput!): UserEmailChangeResult!` — enforce `grantAccessOrFail(actor, platformPolicy, PLATFORM_ADMIN)` before calling `UserEmailChangeService.applyAdminEmailChange(currentUser.id, input.userID, input.newEmail)` (FR-002, FR-013, FR-018)
- [ ] T022 [US1] Create `AdminUserEmailChangeModule` in `src/platform-admin/domain/user/email-change/admin.user.email.change.module.ts` importing `UserEmailChangeModule` + `AuthorizationModule`; register the admin mutation resolver; import the module into the platform-admin GraphQL aggregator (depends on T021)
- [ ] T023 [P] [US1] Unit spec `src/domain/community/user-email-change/user.email.change.service.apply.spec.ts` covering `applyAdminEmailChange` happy path: Kratos-then-Alkemio ordering, sessions invalidated, security-signal published, audit entry `committed` written, retry helper mocked to succeed-on-first. Parametrize the Kratos identity fixture across credential types `password-only`, `oidc-only`, `password+oidc` and assert all three reach `committed` with identical service-layer behaviour (FR-002a).
- [ ] T024 [P] [US1] Unit spec `src/platform-admin/domain/user/email-change/admin.user.email.change.resolver.mutations.spec.ts` asserting: caller-without-PLATFORM_ADMIN → throws `EMAIL_CHANGE_UNAUTHORIZED`; caller-with-PLATFORM_ADMIN → delegates to service with correct args; service's returned `UserEmailChangeResult` is propagated verbatim
- [ ] T025 [US1] Integration spec `test/functional/integration/user-email-change-admin.it-spec.ts` covering Scenario 1 end-to-end against real Postgres + mocked Kratos HTTP: admin invokes mutation → assert `user.email` updated + Kratos identity trait updated (with `verifiable_addresses` verified per FR-011) + `disableIdentitySessions` called + security-signal published with masked new email + audit entry `committed` written. Run twice with the Kratos mock identity shaped as (a) password-only and (b) oidc-only (FR-002a).

**Checkpoint**: User Story 1 functional. Quickstart Scenario 1 passes. SC-001, SC-007, SC-008 verified.

---

## Phase 3: User Story 2 — Atomic Two-Side Commit With Rollback (Priority: P1)

**Goal**: Forward-commit failures roll back atomically; rollback failures write a `drift_detected` audit entry with a Winston error log + APM `captureError`, and an admin can reconcile via `adminUserEmailChangeDriftResolve`.

**Independent Test**: Run quickstart.md §Scenario 3 (fault-injected Kratos failure → `rolled_back` audit entry, both sides on old email) and §Scenario 4 (double-fault → `drift_detected` audit entry → admin resolves).

### Implementation for User Story 2

- [ ] T026 [P] [US2] Create `AdminUserEmailChangeDriftResolveInput` DTO with `@IsUUID() userID` + `@IsEmail() canonicalEmail` in `src/platform-admin/domain/user/email-change/dto/admin.user.email.change.drift.resolve.dto.input.ts`
- [ ] T027 [US2] Implement the compensating-rollback branch of `UserEmailChangeService.applyAdminEmailChange` in `src/domain/community/user-email-change/user.email.change.service.ts`: if Kratos forward write fails after `retryWithBackoff` exhaustion → write `rolled_back` audit entry (no Alkemio change had occurred — Kratos-first per R4), throw `EMAIL_CHANGE_KRATOS_WRITE_FAILED` / `EMAIL_CHANGE_KRATOS_UNREACHABLE`; if Alkemio write fails after Kratos succeeded → revert Kratos via `updateIdentityEmailTrait(...oldEmail)` inside `retryWithBackoff` → on success write `rolled_back` audit entry and throw `EMAIL_CHANGE_ALKEMIO_WRITE_FAILED` (FR-009, R4, R5)
- [ ] T028 [US2] Implement the drift-detection branch in `UserEmailChangeService.applyAdminEmailChange`: if the Kratos-revert step exhausts its retry budget → write `drift_detected` audit entry with `oldEmail = original Alkemio value` and `newEmail = Kratos-observed value`, set `failureReason` to a short non-leaky code (e.g., `kratos_unreachable`), emit Winston `error`-level entry tagged `email_change_drift_detected`, call `apm.captureError(error, { custom: { marker: 'email_change_drift_detected', ... } })`, throw `EMAIL_CHANGE_DRIFT_DETECTED` (FR-009a, R5)
- [ ] T029 [US2] Implement `UserEmailChangeService.resolveDrift(adminId, subjectUserId, canonicalEmail)` in `src/domain/community/user-email-change/user.email.change.service.ts`: look up the latest audit entry for the subject (`UserEmailChangeAuditEntryRepository.findLatestBySubject`); if its outcome is NOT `drift_detected`, OR if there is a subsequent `drift_resolved` entry, throw `EMAIL_CHANGE_DRIFT_NOT_FOUND`; reject `canonicalEmail` not in `{drift.oldEmail, drift.newEmail}` (validation error); read current Alkemio + Kratos values via `KratosService.getIdentityEmailTrait`; apply alignment writes only where the observed value differs from `canonicalEmail`, each wrapped in `retryWithBackoff`; on success write `drift_resolved` audit entry; on retry exhaustion write `drift_resolution_failed` audit entry and throw `EMAIL_CHANGE_DRIFT_RESOLUTION_FAILED` (FR-009b)
- [ ] T030 [US2] Add drift-resolve mutation to `src/platform-admin/domain/user/email-change/admin.user.email.change.resolver.mutations.ts` (extend the same resolver class from T021): `adminUserEmailChangeDriftResolve(adminUserEmailChangeDriftResolveData: AdminUserEmailChangeDriftResolveInput!): UserEmailChangeResult!` with `grantAccessOrFail(...PLATFORM_ADMIN)` (FR-009b)
- [ ] T031 [P] [US2] Unit spec `src/domain/community/user-email-change/user.email.change.service.commit.spec.ts` covering the three commit outcomes via fault injection on a mocked `KratosService`: forward-success → `committed`; forward-fail → `rolled_back`; forward-fail + rollback-fail → `drift_detected` with Winston + APM mocks asserted
- [ ] T032 [P] [US2] Unit spec `src/domain/community/user-email-change/user.email.change.service.drift.spec.ts` covering `resolveDrift`: not-found (no drift_detected audit entry), already-resolved (subsequent drift_resolved entry present), invalid canonicalEmail, single-side alignment, both-sides-already-aligned (no-op success), retry exhaustion → `drift_resolution_failed`
- [ ] T033 [US2] Integration spec `test/functional/integration/user-email-change-rollback.it-spec.ts` (Scenario 3): inject Kratos `updateIdentity` failure after retries → assert audit entry `rolled_back`, both sides reflect old email, GraphQL error code `EMAIL_CHANGE_KRATOS_WRITE_FAILED`
- [ ] T034 [US2] Integration spec `test/functional/integration/user-email-change-drift.it-spec.ts` (Scenario 4): inject BOTH forward Kratos failure AND Kratos-revert failure → assert audit entry `drift_detected`, GraphQL error `EMAIL_CHANGE_DRIFT_DETECTED`, Winston `error` + APM `captureError` invocations recorded; then call `adminUserEmailChangeDriftResolve` with `canonicalEmail = old_email` and assert both sides realign + `drift_resolved` audit entry written (the original `drift_detected` entry is NOT modified)

**Checkpoint**: US1+US2 functional. SC-002 / SC-004 / SC-005 verified by integration. The atomicity guarantee that prompted the feature is in place.

---

## Phase 4: User Story 3 — Conflict and Validation Errors (Priority: P2)

**Goal**: Format / no-change / conflict errors return BEFORE any side-write is attempted; each rejection writes a matching audit entry.

**Independent Test**: Run quickstart.md §Scenario 2 (malformed → `EMAIL_CHANGE_VALIDATION`; current → `EMAIL_CHANGE_NO_CHANGE`; conflict → `EMAIL_CHANGE_CONFLICT` with no leak of conflict-holder). Audit entries for each rejection.

### Implementation for User Story 3

- [ ] T035 [US3] In `UserEmailChangeService.applyAdminEmailChange`, ensure the validation pipeline runs BEFORE the Kratos call (it already exists per T020; harden the order and the audit-entry writes here): (a) DTO `@IsEmail()` already gives RFC 5322 basics; service throws `EMAIL_CHANGE_VALIDATION` for any residual reject AND writes a `rejected_validation` audit entry; (b) compare `newEmail.toLowerCase() === subjectCurrentEmail.toLowerCase()` → throw `EMAIL_CHANGE_NO_CHANGE` AND write `rejected_validation` audit entry with failure_reason=`no_change`; (c) Alkemio uniqueness via `LOWER(email)` query on `user`; (d) Kratos uniqueness via `KratosService.findIdentityByEmail`; either uniqueness hit → throw `EMAIL_CHANGE_CONFLICT` with a generic non-leaky message AND write `rejected_conflict` audit entry (FR-004, FR-005, FR-006, FR-014, R7)
- [ ] T036 [US3] Create central error-mapping helper in `src/domain/community/user-email-change/user.email.change.errors.ts` mapping each internal failure → `{ code: string, message: string, httpStatus: number }` per contracts/graphql.md §6; ensure `EMAIL_CHANGE_CONFLICT` constructs the same generic message regardless of which side flagged the conflict (anti-enumeration per FR-014)
- [ ] T037 [P] [US3] Unit spec `src/domain/community/user-email-change/user.email.change.service.validation.spec.ts` covering each pre-Kratos rejection path and asserting that NO Kratos call is made AND a matching audit entry is written
- [ ] T038 [US3] Integration spec `test/functional/integration/user-email-change-validation.it-spec.ts` covering Scenario 2: malformed, no-change, conflict — each asserts no Kratos call + correct GraphQL error code + audit entry with matching `rejected_*` outcome and non-leaky `failureReason`

**Checkpoint**: SC-006 verified — zero side-writes for rejected attempts; every rejection audited.

---

## Phase 5: User Story 4 — Audit Trail (Priority: P3)

**Goal**: Every change attempt produces an audit entry; admins can query the entries paginated under `platformAdmin`, plus a quick latest-entry query for drift checks.

**Independent Test**: Run quickstart.md §Scenario 5. After scenarios 1–4, the audit query for Alice returns the expected entries in descending order with `{id, displayName}` only for `initiator` / `subject`, no PII leak in `failureReason`.

### Implementation for User Story 4

- [ ] T039 [P] [US4] Create GraphQL object types `UserEmailChangeAuditEntry` and `UserEmailChangeAuditEntries` (per contracts/graphql.md §2) in `src/domain/community/user-email-change/dto/user.email.change.audit.entry.ts` — include `subject: UserProfileSummary!`, `initiator: UserProfileSummary` (nullable for sentinel), `initiatorRole`, `oldEmail?`, `newEmail?`, `outcome`, `failureReason?`, `timestamp`, plus the wrapper with `pageInfo` and `total`
- [ ] T040 [US4] Implement `UserEmailChangeService.getAuditEntriesForSubject(subjectUserId, cursorArgs)` in `src/domain/community/user-email-change/user.email.change.service.ts`: cursor-paginated query on `email_change_audit_entry` ordered by `created_date DESC`, resolves `initiator` / `subject` to `UserProfileSummary` via `UserLookupService`; when initiator cannot be resolved (early-rejection entry where `initiator_user_id IS NULL`), return `initiator: null` and rely on `initiatorRole` (FR-014b sentinel handling)
- [ ] T041 [US4] Implement `UserEmailChangeService.getLatestAuditEntryForSubject(subjectUserId)` returning the single most-recent audit entry mapped to `UserEmailChangeAuditEntry`, or null if none exists (FR-021)
- [ ] T042 [US4] Create admin field resolver in `src/platform-admin/domain/user/email-change/admin.user.email.change.resolver.fields.ts` exposing both `PlatformAdminQueryResults.latestUserEmailChangeAuditEntry(userID: UUID!): UserEmailChangeAuditEntry` and `userEmailChangeAuditEntries(userID, after, first, before, last): UserEmailChangeAuditEntries!` with `PLATFORM_ADMIN` authorization; the paginated query follows `docs/Pagination.md` (FR-014b, FR-021)
- [ ] T043 [US4] Register the field resolver in the `AdminUserEmailChangeModule` (extend T022)
- [ ] T044 [P] [US4] Unit spec `src/domain/community/user-email-change/user.email.change.service.audit.spec.ts` asserting one audit entry written per outcome (parametric — iterate over every transition path: committed, rolled_back, drift_detected, drift_resolved, drift_resolution_failed, security_signal_failed, session_invalidation_failed, rejected_validation, rejected_conflict), and asserting `failureReason` strings never contain the conflict-account identifier (anti-enumeration)
- [ ] T045 [US4] Integration spec `test/functional/integration/user-email-change-audit.it-spec.ts` (Scenario 5): execute a sequence that exercises every audit outcome at least once, then query `userEmailChangeAuditEntries` paginated → assert descending order, every outcome present, `initiator`/`subject` carry only `{id, displayName}`, sentinel-initiator entry returns `initiator: null` with `initiatorRole` still set. Separately assert `latestUserEmailChangeAuditEntry` returns the most-recent entry.

**Checkpoint**: SC-003 verified — audit entry produced for every attempt. SC-008 verified — exactly one security-signal on success (or zero plus `security_signal_failed` audit entry on mail-send exhaustion).

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Schema baseline, validation harness, documentation, and the end-to-end quickstart walk-through.

- [ ] T046 Regenerate GraphQL schema: `pnpm run schema:print && pnpm run schema:sort`, commit resulting `schema.graphql` — verify against contracts/graphql.md §8 expectations: additions-only (2 enums, 4 object types, 2 inputs, 2 mutations, 2 query fields), no breaking changes
- [ ] T047 Run schema diff: `pnpm run schema:diff` against `tmp/prev.schema.graphql`, review `change-report.json` — confirm zero breaking changes, zero deprecations
- [ ] T048 Run migration validation harness: `pnpm run migration:validate` (executes `.scripts/migrations/run_validate_migration.sh`) against the migration produced by T003 — verifies idempotency under snapshot/apply/CSV-diff/restore
- [ ] T049 [P] Run lint and typecheck: `pnpm lint` and `pnpm test:ci:no:coverage` — fix any Biome / `tsc --noEmit` issues introduced
- [ ] T050 Walk through the full quickstart.md end-to-end (all 5 scenarios) against a local stack started with `pnpm run start:services` + `pnpm start:dev`; check off SC-001 through SC-008 in §What success looks like

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Foundational)**: No dependencies — start immediately. BLOCKS all user-story phases.
- **Phase 2 (US1 Admin Change)**: Depends on Phase 1. MVP-shippable on its own (sans atomicity hardening from US2 — see "MVP First" below).
- **Phase 3 (US2 Atomic)**: Depends on Phase 1 AND requires the US1 `applyAdminEmailChange` happy-path scaffolding from T020 to extend.
- **Phase 4 (US3 Validation)**: Depends on Phase 1 AND requires US1 `applyAdminEmailChange` (T020) to wrap validation around. Validation logic is partially in T020 already; T035 hardens the order + audit-entry writes.
- **Phase 5 (US4 Audit)**: Depends on Phase 1 AND benefits from every outcome path from US1–US3 already existing (the audit-entry writes are sprinkled across those services).
- **Phase 6 (Polish)**: Depends on every user story phase intended for the release.

### Within Each User Story

- DTOs / GraphQL object types ([P] across files) before resolvers
- Service methods before resolvers
- Resolvers before module registration
- Unit specs run in parallel with implementation
- Integration spec is the closing acceptance gate for the story

### Parallel Opportunities

- **Phase 1**: T001, T002 in parallel (enum files). T004 [P]. T005 after T001/T002/T004. T006 after T005. T007, T008 in parallel (independent utils). T016, T017 [P] alongside their util implementations. T009 stands alone. T010 → T011 → T012 sequential. T013, T014, T015 sequential within notification chain.
- **US1**: T018, T019 [P]. T023, T024 [P] alongside T020/T021 implementation.
- **US2**: T026 [P]. T031, T032 [P] alongside T027–T030.
- **US3**: T037 [P] alongside T035/T036.
- **US4**: T039 [P] alongside T040–T043. T044 [P] alongside implementation.
- **Polish**: T049 [P] can run alongside T046–T048 once the latter complete.

---

## Implementation Strategy

### MVP First (User Story 1 + slice of User Story 2)

US1 alone is shippable but unsafe — it lacks the rollback path. The smallest production-grade slice is:

1. Complete Phase 1: Foundational
2. Complete Phase 2: User Story 1 (T018–T025)
3. Complete T027–T028 from Phase 3 (US2 rollback + drift detection — atomicity is the very thing the feature exists to deliver)
4. Complete T035–T036 from Phase 4 (US3 validation/conflict — required to honour SC-006)
5. **STOP and VALIDATE**: Quickstart Scenarios 1, 2, 3, 4
6. Deploy/demo

This MVP fulfils SC-001, SC-002, SC-004, SC-005, SC-006, SC-007, SC-008 — the production-grade admin-on-behalf flow.

### Incremental Delivery

1. **MVP** (above): admin-on-behalf path, atomic commit, validation, rollback, drift handling
2. **+ US4**: audit query surface → SC-003 (most of SC-003's writes are already in MVP via US1+US2+US3; this slice adds the admin queries)
3. **+ Polish (Phase 6)**: schema baseline, full quickstart pass
4. **+ Spec 098 (self-service with verification)**: lands on top of this foundation; adds the `email_change_pending` entity, the token, the multi-step lifecycle, the `me`-surface entry point, and the session-less confirm root mutation.

### Parallel Team Strategy

With multiple developers, after Phase 1 closes:

- **Dev A**: US1 trunk (T018–T025) → US2 atomicity (T026–T034)
- **Dev B**: US3 validation (T035–T038) — touches the same service file, coordinates with Dev A
- **Dev C**: US4 audit query surface (T039–T045), runs once US1–US3 transitions are in
- All converge into Phase 6 for schema regeneration, migration validation, and the quickstart pass

---

## Notes

- All file paths follow plan.md §Project Structure exactly.
- `UserEmailChangeService` is the single mutation-side service file shared by US1, US2, US3, US4 — these stories are sequenced inside that file. Plan code reviews to focus on this file as the integration point. Spec 098 extends the same service with `initiateSelf`, `confirm`, and `getActivePendingForSubject`; coordinate ownership.
- Every `failureReason` value written into an audit entry MUST be a short non-leaky code (e.g., `kratos_unreachable`, `conflict`, `malformed_email`, `no_change`); free-form messages with account-existence hints are a spec violation per FR-014.
- The two new GraphQL enums (`UserEmailChangeAuditOutcome`, `UserEmailChangeInitiatorRole`) are public schema surface — once landed, additions are non-breaking but value removals require BREAKING-APPROVED. The `UserEmailChangeInitiatorRole` enum ships with both `SELF` and `PLATFORM_ADMIN` values upfront so spec 098 requires no enum extension.
- Migration T003 is single-file and idempotent — coordinate with whoever else is generating migrations in the same release to avoid timestamp collisions.
- `pnpm run schema:print && pnpm run schema:sort` MUST run before opening the PR; the schema baseline workflow handles the post-merge regeneration of `schema-baseline.graphql`.
- Stop at any phase checkpoint to validate the corresponding quickstart scenario.
- Constitution alignment: this task plan honours Principles 1 (domain-centric — all logic in the new module), 3 (additive schema), 4 (explicit flow — validation → auth → domain → audit → notification → state), 6 (risk-based testing — utilities + service + integration), 10 (no new infra; no pending entity; no token; reuses NotificationExternalAdapter / Winston / APM).
