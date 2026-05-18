---
description: 'Task list — feature 098-self-service-email-change'
---

# Tasks: Self-Service Email Change

**Input**: Design documents from `/specs/098-self-service-email-change/`
**Prerequisites**: spec.md, plan.md, contracts/graphql.md, **AND** the foundation contracted in `/specs/097-change-user-email/` (which MUST be merged before this spec's tasks can begin).

**Tests**: INCLUDED — one unit spec per new service method + one resolver-authorization spec + one end-to-end integration spec covering the self-service flow.

**Organization**: Tasks are grouped by user story. US1 covers self-initiation + the self-service happy path. US2 covers the subject-user read query (`me.pendingEmailChange`) including admin-profile-summary resolution and the `awaitingAdminReconciliation` indicator.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Maps to a user story from spec.md (US1, US2)
- Task IDs are scoped to this spec and start at S001 (the `S` prefix distinguishes them from 097's `T` IDs)
- All paths are repository-root-relative

---

## Phase 1: Prerequisites (Foundation from 097)

**⚠️ CRITICAL**: This phase is satisfied by the merge of spec 097. Verify before starting any S-task:

- [ ] Spec 097 has been merged.
- [ ] `email_change_pending` and `email_change_audit_entry` tables exist (097 T008 migration).
- [ ] `UserEmailChangeService` exists with `initiateAdmin`, `confirm`, `resolveDrift`, `getStateForSubject` methods (097 T020 + later phases).
- [ ] `UserEmailChangeModule` exports `UserEmailChangeService` (097 T021).
- [ ] `email_change_initiator_role` Postgres enum already carries both `self` and `platform_admin` values (097 T008).
- [ ] `endpoints.client_web` config key wired through `ConfigService` (097 T001/T002).
- [ ] `USER_EMAIL_CHANGE_CONFIRMATION` notification event publishes with role-tag payload supporting both `SELF` and `PLATFORM_ADMIN` (097 T003/T004/T022).

---

## Phase 2: User Story 1 — User Initiates Self-Service Email Change (Priority: P1)

**Goal**: A logged-in user can initiate a change to their own login email via `meUserEmailChangeBegin`, confirm via the session-less `userEmailChangeConfirm` root mutation (097), and end up logged in only with the new address.

**Independent Test**: Run the integration spec `test/functional/integration/user-email-change-self.it-spec.ts`. Alice initiates, MailSlurper shows the confirmation with role tag `self`, Alice confirms session-lessly, the old email no longer authenticates against Kratos, her profile id and memberships are unchanged.

### Implementation for User Story 1

- [ ] S001 [P] [US1] Create `MeUserEmailChangeBeginInput` DTO with `@IsEmail()`-validated `newEmail` in `src/services/api/me/email-change/dto/me.user.email.change.begin.dto.input.ts`
- [ ] S002 [US1] Add `initiateSelf(subjectUserId, newEmail)` method to `UserEmailChangeService` in `src/domain/community/user-email-change/user.email.change.service.ts` — same body as `initiateAdmin` but tags `initiatorRole=SELF` and records `initiatorUserId=subjectUserId`. All shared concerns (supersession, validation pipeline, atomic mail-send / pending-row pair from 097's FR-019a, token generation, audit-entry writes) are inherited from the existing `initiateAdmin` implementation — refactor common logic into a private helper if the duplication is non-trivial (spec.md §FR-001).
- [ ] S003 [US1] Create me-shape mutation resolver in `src/services/api/me/email-change/me.user.email.change.resolver.mutations.ts` exposing `meUserEmailChangeBegin(meUserEmailChangeBeginData: MeUserEmailChangeBeginInput!): UserEmailChangePending!`; resolver delegates to `UserEmailChangeService.initiateSelf(currentUser.id, input.newEmail)`. No `userID` argument — the subject is always the caller (FR-001, FR-013).
- [ ] S004 [US1] Create `MeUserEmailChangeApiModule` in `src/services/api/me/email-change/me.user.email.change.api.module.ts` importing `UserEmailChangeModule` (exported by 097) + `AuthorizationModule`; register the mutation resolver + the field resolver from S008; import the module into the `MeModule` aggregator at `src/services/api/me/me.module.ts` (depends on S003, S008)
- [ ] S005 [P] [US1] Unit spec `src/domain/community/user-email-change/user.email.change.service.initiate.self.spec.ts` covering `initiateSelf` happy path: produces pending row with `initiatorRole=SELF`, supersedes any prior pending row (regardless of who initiated it), publishes confirmation event with `initiatorRole=SELF` in the payload, applies the same validation pipeline as `initiateAdmin`. Parametrize the Kratos identity fixture across credential types `password-only`, `oidc-only`, `password+oidc` (FR-001a).
- [ ] S006 [P] [US1] Unit spec `src/services/api/me/email-change/me.user.email.change.resolver.mutations.spec.ts` asserting: unauthenticated caller → rejected by the standard authentication guard; authenticated caller → delegates to `UserEmailChangeService.initiateSelf` with `currentUser.id` as the subject (never with a `userID` from input — there is no such argument); the returned `UserEmailChangePending` is propagated verbatim.
- [ ] S007 [US1] Integration spec `test/functional/integration/user-email-change-self.it-spec.ts` covering self-service end-to-end against real Postgres + mocked Kratos HTTP: Alice authenticates → initiates → MailSlurper assertion (role tag = `self`, no admin profile in message) → confirms session-lessly via 097's `userEmailChangeConfirm` → asserts `user.email` updated + Kratos identity trait updated + `disableIdentitySessions` called + security-signal published with masked new email and role tag `self`. Run twice with the Kratos mock identity shaped as (a) password-only and (b) oidc-only (FR-001a).

**Checkpoint**: User Story 1 functional. Self-service end-to-end passes. SC-001 verified.

---

## Phase 3: User Story 2 — Subject-User Read Query (Priority: P2)

**Goal**: A subject user can read their own active pending change via `me.pendingEmailChange`, including admin-profile-summary disclosure when admin-initiated and the `awaitingAdminReconciliation` indicator when in `drift_detected`.

**Independent Test**: 
1. Polly (admin) initiates a change for Alice via 097's `adminUserEmailChangeBegin`. Alice queries `me.pendingEmailChange` and sees `initiatorRole: PLATFORM_ADMIN` + `initiatorAdmin: { id: <polly-id>, displayName: <polly-displayName> }`. Polly's email is absent.
2. Bob queries `me.pendingEmailChange` (he has no pending change) → null.
3. Inject a `drift_detected` state on Alice's record (via 097's drift integration harness). Alice queries → response is returned with `awaitingAdminReconciliation: true` and without per-side observed email values.

### Implementation for User Story 2

- [ ] S008 [US2] Extend `UserEmailChangePending` GraphQL object type in `src/domain/community/user-email-change/dto/user.email.change.pending.ts` (owned by 097) with two additive fields: `initiatorAdmin: UserProfileSummary` (nullable; present iff `initiatorRole === PLATFORM_ADMIN`) and `awaitingAdminReconciliation: Boolean!` (true iff `state === DRIFT_DETECTED`). The fields are additive at the GraphQL contract level — clients of the admin path that only read the original fields are unaffected.
- [ ] S009 [US2] Add `getActivePendingForSubject(subjectUserId)` method to `UserEmailChangeService` in `src/domain/community/user-email-change/user.email.change.service.ts`: returns the row in state INITIATED, CONFIRMED, or (DRIFT_DETECTED within 30-day FR-020 window) mapped to `UserEmailChangePending`; returns null otherwise. The mapper MUST: (a) resolve `initiatorAdmin: UserProfileSummary` via `UserLookupService` ONLY when `initiatorRole === PLATFORM_ADMIN`, returning `{id, displayName}` and nothing else (no email, no other PII); (b) set `awaitingAdminReconciliation: true` iff `state === DRIFT_DETECTED`; (c) NOT expose per-side observed email values, technical failure reasons, or other internal diagnostics for the `drift_detected` case (FR-022, FR-022a).
- [ ] S010 [US2] Create me-shape field resolver in `src/services/api/me/email-change/me.user.email.change.resolver.fields.ts` exposing `MeQueryResults.pendingEmailChange: UserEmailChangePending` returning `UserEmailChangeService.getActivePendingForSubject(currentUser.id)`. The resolver MUST NOT accept a `userID` argument; the subject is always the caller (FR-022).
- [ ] S011 [P] [US2] Unit spec `src/domain/community/user-email-change/user.email.change.service.get.active.pending.spec.ts` covering `getActivePendingForSubject` across every observable state: INITIATED (returns row), CONFIRMED (returns row), COMMITTED (returns null — terminal-success not exposed by FR-022), ROLLED_BACK / EXPIRED / SUPERSEDED (returns null), DRIFT_DETECTED within 30-day window (returns row with `awaitingAdminReconciliation: true` and no diagnostic fields), DRIFT_DETECTED past 30-day window (returns null), SELF-initiated row (returns row without `initiatorAdmin`), PLATFORM_ADMIN-initiated row (returns row with `initiatorAdmin: {id, displayName}` only — assert email/PII fields are absent from the resolved profile summary).
- [ ] S012 [P] [US2] Unit spec `src/services/api/me/email-change/me.user.email.change.resolver.fields.spec.ts` asserting: caller-subject equality is enforced (resolver always uses `currentUser.id`, never an input-supplied id); when 097's service returns a pending row for a DIFFERENT user, this resolver MUST NOT return it (sanity test on the contract; the service contract guarantees this but the resolver layer should validate as defense-in-depth).
- [ ] S013 [US2] Integration spec `test/functional/integration/user-email-change-me-query.it-spec.ts`: Scenario (a) Polly admin-initiates → Alice queries `me.pendingEmailChange` → asserts `initiatorRole: PLATFORM_ADMIN` + `initiatorAdmin: {id, displayName}` only + `awaitingAdminReconciliation: false`; Scenario (b) Alice self-initiates → Alice queries → asserts `initiatorRole: SELF` + no `initiatorAdmin` field; Scenario (c) Bob queries with no pending change → null; Scenario (d) inject DRIFT_DETECTED on Alice's record → Alice queries → asserts the record is returned with `awaitingAdminReconciliation: true` and no per-side diagnostic fields visible (FR-022, FR-022a, SC-003, SC-004, SC-005).

**Checkpoint**: User Story 2 functional. SC-003, SC-004, SC-005 verified.

---

## Phase 4: Polish

- [ ] S014 Regenerate GraphQL schema: `pnpm run schema:print && pnpm run schema:sort`, commit resulting `schema.graphql`. Expected diff vs the post-097 baseline: 1 new input (`MeUserEmailChangeBeginInput`), 1 new mutation (`meUserEmailChangeBegin`), 1 new query field (`MeQueryResults.pendingEmailChange`), and 2 new fields on `UserEmailChangePending` (`initiatorAdmin: UserProfileSummary`, `awaitingAdminReconciliation: Boolean!`). All additive.
- [ ] S015 Run schema diff: `pnpm run schema:diff` against `tmp/prev.schema.graphql`, review `change-report.json` — confirm zero breaking changes, zero deprecations.
- [ ] S016 [P] Run lint and typecheck: `pnpm lint` and `pnpm test:ci:no:coverage`.
- [ ] S017 Manual walk-through of the self-service flow using contracts/graphql.md as the script. Verify the `me.pendingEmailChange` query returns the expected shapes for SELF, PLATFORM_ADMIN, and DRIFT_DETECTED cases.

---

## Dependencies & Execution Order

- Phase 1 satisfied by 097 merge.
- Phase 2 (US1): S001 [P]; S002 sequential; S003 depends on S001+S002; S005 [P] alongside S002; S006 [P] alongside S003. S004 depends on S003+S008 (it registers both resolvers). S007 is the closing integration gate.
- Phase 3 (US2): S008 [P]; S009 sequential after S008; S010 depends on S008+S009; S011 [P] alongside S009; S012 [P] alongside S010. S013 is the closing integration gate.
- Phase 4: After both user stories merge. S016 [P] alongside S014/S015.

---

## Notes

- This spec adds **two** methods to `UserEmailChangeService`. Coordinate code review on that file with 097's owners.
- All foundational logic (validation, retry, rollback, drift handling, audit writes, security signal, session invalidation, root confirm mutation) is reused unchanged from 097. This spec MUST NOT redefine those behaviours.
- The `me.pendingEmailChange` resolver MUST refuse to accept any `userID` argument. The subject is always `currentUser.id`. This is enforced by the resolver shape, not by service-layer discipline.
- The `initiatorAdmin` field MUST expose ONLY `{id, displayName}` — never the admin's email or other PII. Constitution Principle 8 (Secure-by-Design).
- Schema baseline regeneration handled by the post-merge `schema-baseline.yml` workflow per CLAUDE.md.
- Constitution alignment: this task plan honours Principles 1, 3, 4, 8, 10 (single-purpose additive surface, no new infrastructure, no parallel state machine).
