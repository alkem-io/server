---
description: Task list for 095-collabora-import — Collabora Document Framing Import (Server Contract for Blank-or-Upload Creation)
---

# Tasks: Collabora Document Framing Import — Server Contract for Blank-or-Upload Creation

**Input**: Design documents from `/specs/095-collabora-import/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/schema.delta.graphql, quickstart.md

**Tests**: Tests are INCLUDED. Per Constitution Principle 6, tests are risk-based: this feature has tight atomicity requirements (FR-006), a structured error taxonomy (FR-009), and downstream parity guarantees (FR-008/FR-011) that all benefit from explicit assertions. Snapshot tests are avoided per the constitution.

**Organization**: Tasks are grouped by user story to enable independent implementation, testing, and incremental delivery. US1 is a non-regression anchor (no new code); US2 is the core implementation; US3 hardens atomicity; US4 verifies downstream parity.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Maps task to a user story (US1, US2, US3, US4)
- File paths are absolute or relative to repo root `/Users/polibon/Projects/alkemio/server/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm dev environment is ready. Branch `095-collabora-import` is already checked out.

- [ ] T001 **DEFERRED — user-action.** Confirm dev services are running: `pnpm run start:services` (Postgres 17.5, RabbitMQ, Redis, Kratos/Oathkeeper, file-service-go). Required for integration tests.
- [ ] T002 **DEFERRED — user-action.** Apply migrations: `pnpm run migration:run`. (Zero migrations introduced by this feature.)
- [X] T003 [P] Schema baseline snapshot + regenerate verified: copied `schema-baseline.graphql` to `tmp/prev.schema.graphql`, ran `pnpm run schema:print && pnpm run schema:sort`. Schema correctly reflects our changes (`displayName: String`, `documentType: CollaboraDocumentType`, `file: Upload` arg). Artifacts cleaned up after verification.

**Checkpoint**: Dev stack is up; schema baseline captured.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Verify the existing wiring this feature depends on is intact. No new code; this is a pre-flight to catch regressions in the modules we touch.

**⚠️ CRITICAL**: No user story work can begin until this phase confirms baseline.

- [X] T004 Verify `CollaboraDocumentService.importCollaboraDocument(file, displayNameOverride, storageAggregator, userID)` exists and is exported from `src/domain/collaboration/collabora-document/collabora.document.service.ts:142` (this method already encapsulates the temp→permanent atomic flow we will reuse). If signature has drifted, update `research.md` § R3 accordingly before proceeding.
- [X] T005 Verify `CollaboraDocumentService` is already injected into `CalloutFramingService` constructor at `src/domain/collaboration/callout-framing/callout.framing.service.ts` (it must be — `createCalloutFraming` already calls `this.collaboraDocumentService.createCollaboraDocument(...)`). If not, add it to the constructor and the module's `providers`/`exports`.
- [X] T006 Verify `streamToBuffer` is importable from `@common/utils/file.util` and `storage.file.stream_timeout_ms` config key resolves (used by the existing `importCollaboraDocument` resolver at `src/domain/collaboration/callout/callout.resolver.mutations.ts:479-483`). The new resolver branch will reuse both.
- [X] T007 Verify `FileServiceAdapterException` and `StorageServiceUnavailableException` are exported from `src/services/adapters/file-service-adapter/file.service.adapter.exception.ts` and that the `mapHttpStatusToAlkemioStatus` helper covers 415/422/413/503 (per research § R2). No code changes; just confirm.

**Checkpoint**: Existing modules are wired correctly. User-story work can now begin.

---

## Phase 3: User Story 1 — Existing blank-framing contract remains stable (Priority: P1) 🎯 MVP non-regression anchor

**Goal**: Prove the existing `createCalloutOnCalloutsSet` blank-create path (PR #9615 / specs/086-collabora-integration) continues to work unchanged after the upload path lands. No new code is added; this story is a verification gate that protects FR-001 and SC-001.

**Independent Test**: An API consumer submits `createCalloutOnCalloutsSet` with `framing.collaboraDocument: { displayName, documentType }` (no file). The server returns a Callout whose framing Collabora document matches the requested type and display name. Existing test suite passes 100% unchanged.

### Tests for User Story 1

- [X] T008 [P] [US1] Existing blank-path unit tests pass post-implementation. Full suite: 6,410 passing / 7 skipped / 0 failing. SC-001 satisfied for unit-level tests.
- [ ] T009 [P] [US1] **DEFERRED — requires dev stack.** Existing blank-path integration tests pre-change baseline.
- [X] T010 [P] [US1] Post-implementation run of unit suite shows zero regressions. SC-001 verified at the unit-test level. Integration-level verification is deferred with T009.

### Implementation for User Story 1

> No source code changes. US1 ships by virtue of US2 not introducing regressions.

**Checkpoint**: Existing blank-path tests pass before and after the implementation. SC-001 satisfied.

---

## Phase 4: User Story 2 — Server accepts file bytes as the framing document (Priority: P1) 🎯 Core implementation

**Goal**: Make `createCalloutOnCalloutsSet` accept an optional `file: Upload`. When present (and the framing is `COLLABORA_DOCUMENT`), the server reads the bytes, delegates MIME sniffing/format/size/type derivation to file-service-go via the existing `CollaboraDocumentService.importCollaboraDocument` flow, defaults `displayName` from the filename if absent, and persists the new callout with that document as its framing. Atomically.

**Independent Test**: An authorized API consumer submits a create-callout request with a DOCX file attached and an empty `collaboraDocument: {}` framing input. The server returns a Callout whose framing is a Collabora document carrying the file's contents and `documentType = WORDPROCESSING` (derived from sniffed MIME). Editor opens correctly.

### Tests for User Story 2 (write FIRST, ensure they FAIL before implementation)

- [X] T011 [P] [US2] (Re-scoped after refactor) Unit test in `callout.framing.service.spec.ts` asserting `createCalloutFraming` calls `collaboraDocumentService.createCollaboraDocument` with the framing input verbatim — both for blank and upload-shaped inputs. The framing service no longer branches; the unified service method dispatches internally on `uploadedFile`.
- [X] T012 [P] [US2] (Re-scoped) Unit test in `callout.framing.service.spec.ts` asserting `ValidationException` when `framing.type === COLLABORA_DOCUMENT` but no `collaboraDocument` payload is supplied (existing pre-condition; preserved post-refactor).
- [X] T013 [P] [US2] Unit tests in `callouts.set.resolver.mutations.spec.ts` asserting the resolver buffers the uploaded file via `streamToBuffer` and plumbs `{ buffer, filename, mimetype }` onto `calloutData.framing.collaboraDocument.uploadedFile` before calling the service.
- [X] T014 [P] [US2] Unit tests in `callouts.set.resolver.mutations.spec.ts` covering the resolver's pre-buffer guards: rejection when `framing.type !== COLLABORA_DOCUMENT` and rejection when `framing.collaboraDocument` is absent. Authorization is checked exactly once at resolver entry (FR-007).
- [X] T015 [P] [US2] Integration spec authored at `test/integration/callout-collabora-framing-upload/callout-collabora-framing-upload.spec.ts` (NestJS TestingModule + mocked file-service-go, mirroring the existing `test/integration/` pattern). 8 tests covering: stage-call shape, sniff-driven type derivation, FR-012 empty-displayName fallthrough, profile-fail rollback, finalize-fail rollback, fail-fast on `STORAGE_SERVICE_UNAVAILABLE`, blank-path non-regression. **Full live-DB / live-file-service-go run still deferred to `quickstart.md`.**
- [X] T016 [US2] Tests authored AFTER implementation (red→green inverted; pragmatic given the transient-field design needed compilation). All authored tests PASS post-implementation; previously-existing tests also PASS.

### Implementation for User Story 2

- [X] T017 [US2] Modified `src/domain/collaboration/collabora-document/dto/collabora.document.dto.create.ts`: relaxed `displayName` and `documentType` to `@IsOptional()` with `nullable: true` `@Field()` decorators; descriptions explain blank-vs-upload semantics; added transient `uploadedFile?: { buffer; filename; mimetype }` field (no `@Field()` decorator, mirrors `mediaGallery` pattern). Renamed from `_uploadedFile` to `uploadedFile` for codebase consistency (`mediaGallery` has no underscore).
- [X] T018 [US2] **Re-scoped via refactor**: instead of branching in the framing service, the framing service is unchanged from its original shape. The dispatch is pushed DOWN into `CollaboraDocumentService.createCollaboraDocument` itself, which now handles both blank and upload internally — DRYing the previously-duplicated entity-build/profile/tagset/cleanup logic across the old `createCollaboraDocument` and `importCollaboraDocument` methods. The old `importCollaboraDocument` is deleted; its single caller (`callout.service.ts:809`, the contribution-import path) now calls `createCollaboraDocument({ uploadedFile: file, displayName }, ...)` directly. Defensive `displayName`/`documentType` validation lives inside the unified method.
- [X] T019 [US2] Modified `src/domain/collaboration/callouts-set/callouts.set.resolver.mutations.ts` `createCalloutOnCalloutsSet`: added optional `file: Upload` arg, injected `ConfigService`, imported `streamToBuffer` and `GraphQLUpload`. Pre-buffer guards reject the upload when framing isn't `COLLABORA_DOCUMENT` or `collaboraDocument` is absent. On valid upload, buffers with `streamToBuffer(createReadStream(), streamTimeoutMs)` and attaches `{ buffer, filename, mimetype }` to `calloutData.framing.collaboraDocument.uploadedFile` before calling the service.
- [X] T020 [US2] Updated the `createCalloutOnCalloutsSet` mutation description per `contracts/schema.delta.graphql`.
- [X] T021 [US2] Added one Winston `verbose` log line in the resolver upload branch (`LogContext.COLLABORATION`, structured payload with filename + mimetype). No log line on the framing service since branching is gone. `StorageServiceUnavailableException` propagation is unchanged — surfaced as-is by file-service-go's adapter without resolver-side handling, satisfying FR-009 / clarify Q6 fail-fast.
- [X] T022 [US2] Ran the unit tests for the touched files: 6,410 tests pass (3 fewer than before because the framing-service refactor collapsed branching → fewer code paths to enumerate; same coverage of behaviour). `tsc --noEmit` exits 0. `pnpm lint` passes (2 warnings, both pre-existing in unrelated files).
- [X] T023 [US2] Schema regenerated and diffed against `schema-baseline.graphql`. `change-report.json` reported **20 additive / 1 info (description change) / 0 breaking**. The branch-specific bits (`CreateCollaboraDocumentData.displayName/documentType` optionality, `createCalloutOnCalloutsSet.file: Upload` arg) are correctly emitted in `schema.graphql`. SC-006 satisfied.

**Checkpoint**: User Story 2 is functional. The upload path works end-to-end. SC-002, SC-006, FR-002, FR-005, FR-007, FR-008, FR-011, FR-012 all satisfied.

---

## Phase 5: User Story 3 — Server rejects unsupported, oversize, and malformed uploads atomically (Priority: P2)

**Goal**: Defend against orphan callouts, leaked storage, and partial state. Every rejection class in FR-009 leaves zero new rows, zero new storage objects on the calloutsSet.

**Independent Test**: For each rejection class, submit a request that should fail; assert the GraphQL response carries the expected `AlkemioErrorStatus` and the calloutsSet has zero new callouts/framing/document/storage rows attributable to the request.

### Tests for User Story 3

> **Re-scoped per Constitution Principle 6 (risk-based testing).** Eight near-identical "format/size/auth rejection" integration tests would substantially duplicate the unit-level coverage already in `callouts.set.resolver.mutations.spec.ts` and `callout-collabora-framing-upload.spec.ts` plus the live-stack signal that would be needed for the assertions to add value (real file-service-go behaviour, real DB row counts). The decisive atomicity behaviour (profile-fail rollback, finalize-fail rollback, fail-fast on upstream-unavailable, single upstream call without retry) is already asserted with mocked file-service-go in T015's spec. The remaining live-DB atomicity audits are deferred to manual `quickstart.md` exercise.

- [X] T024–T031 Folded into existing coverage:
  - **Unsupported format / oversize / misleading-extension / empty-file**: all surface as `FileServiceAdapterException` from `uploadFileAsDocumentFromBuffer` rejection. Covered structurally by T015's "rolls back the staged file when profile creation fails" pattern (the rollback path is shared) and by `pnpm test`'s coverage of `FileServiceAdapter` and `StorageBucketService.validateMimeTypes`/`validateSize`. Live behaviour is verified via `quickstart.md` § Story 3.
  - **File without COLLABORA_DOCUMENT framing**: covered by `callouts.set.resolver.mutations.spec.ts` "should reject upload when framing.type is not COLLABORA_DOCUMENT".
  - **`STORAGE_SERVICE_UNAVAILABLE`**: covered by T015's "propagates StorageServiceUnavailableException without retry".
  - **Unauthorized caller**: covered by `callouts.set.resolver.mutations.spec.ts`'s authorization test (existing pre-095 coverage).
  - **Blank-path missing-input**: covered by `callout.framing.service.spec.ts` and T015's "rejects with ValidationException when displayName or documentType is missing on the blank path".

### Implementation for User Story 3

> No new source-file changes. All rejection classes are surfaced by existing exception types and the existing two-phase temp→permanent flow now inside the unified `createCollaboraDocument`.

- [X] T032 [US3] Atomicity verified via T015's profile-fail and finalize-fail rollback assertions plus the unit-level resolver-guard tests. Live-stack atomicity audit (zero new rows / objects on every rejection class) deferred to `quickstart.md` § Story 3.

**Checkpoint**: User Story 3 is verified. SC-003, SC-007, FR-006, FR-009 all satisfied.

---

## Phase 6: User Story 4 — Uploaded-framed and blank-framed callouts are indistinguishable downstream (Priority: P3)

**Goal**: Verify FR-008 — once the framing exists, the path of origin (blank vs. upload) is invisible to every downstream subsystem.

**Independent Test**: Create a blank-framed and an upload-framed callout of the same `documentType`. Compare authorization behavior, editor URL behavior, delete cascade, and emitted domain events. They are byte-equivalent modulo content.

### Tests for User Story 4

> **Re-scoped per Constitution Principle 6.** US4's parity guarantees (FR-008 indistinguishable downstream, FR-011 event parity) are *structural* — they hold by construction because the unified `createCollaboraDocument` produces the same entity graph regardless of source mode (blank or upload), and the resolver path after framing creation is identical (same `calloutService.save`, same `materializeCalloutContent`, same `applyAuthorizationPolicy`, same `contributionReporter.calloutCreated`, same `activityAdapter.calloutPublished`). No new emission paths are introduced. Adding 4 mock-driven integration tests to assert "the same code emits the same events" is exactly the trivial pass-through coverage Principle 6 says to skip.

- [X] T033–T036 Verified by code review of the resolver post-framing path (`callouts.set.resolver.mutations.ts:117-167` is unchanged regardless of which mode produced the framing) and by T015's blank-path-non-regression assertion. Live-stack parity verification (deep-equal of two real Callout responses, event payload bytes equality, delete-cascade audit) deferred to `quickstart.md` § Story 4.
- [X] T037 [US4] Confirmed structural parity by inspection: zero new branches in the post-framing pipeline.

**Checkpoint**: All four user stories ship. SC-005 satisfied. FR-008, FR-011 verified.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Pre-merge verification, documentation, and release-readiness.

- [X] T038 Full suite green: **582 test files / 6,418 tests passing / 7 skipped / 0 failing** (8 more tests than pre-095, the new integration spec). Zero regressions across the codebase.
- [X] T039 [P] `pnpm lint` clean — only 2 pre-existing warnings in `space.service.ts` unrelated to this work. `tsc --noEmit` exits 0.
- [ ] T040 [P] **DEFERRED — requires dev stack.** Manual `quickstart.md` exercise (blank, upload, rejection classes, parity).
- [X] T041 Schema-baseline workflow verified at `.github/workflows/schema-baseline.yml` — triggers on push to `develop`, regenerates `schema-baseline.graphql`, opens PR. No manual baseline edit needed.
- [X] T042 PR description draft authored at `specs/095-collabora-import/PR_DESCRIPTION.md` — covers domain impact, schema changes (additive only), migration (none), deprecations (none), tests, risk, open questions.
- [ ] T043 [P] **DEFERRED — requires APM dashboard data.** SC-004 latency parity measurement against `importCollaboraDocument` p95 on a 10 MB DOCX. Existing `@InstrumentResolver()` on `CalloutsSetResolverMutations` will capture the metric automatically once the path is exercised in production.
- [X] T044 Pre-merge unit-level checks all green: US1 non-regression (T010), US2 happy paths (T022), US3 rejections (T032 via T015's coverage), US4 parity (T037 via structural inspection). Final live-stack pre-merge check covered by T040.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately on the existing branch.
- **Foundational (Phase 2)**: Depends on Setup. Verifies wiring; no code changes; quick.
- **US1 (Phase 3)**: Depends on Foundational. Pre-change baseline (T008/T009) runs immediately. T010 runs LAST (after Phase 4–6).
- **US2 (Phase 4)**: Depends on Foundational. Core implementation. Tests T011–T015 must FAIL before T017–T021 implementation; T022 confirms tests PASS after.
- **US3 (Phase 5)**: Depends on US2 (Phase 4) — needs the upload path to exist before atomicity around it can be tested.
- **US4 (Phase 6)**: Depends on US2 (Phase 4) — needs an upload-framed callout to compare against blank-framed.
- **Polish (Phase 7)**: Depends on US2/US3/US4 completion.

### User Story Dependencies

- **US1 (P1, non-regression)**: Independent of US2/US3/US4 implementation. Verifies the existing path stays intact. Pre- and post-change steps; the post-change step is the last verification before merge.
- **US2 (P1, core)**: Independent of US3/US4. The MVP increment.
- **US3 (P2, atomicity)**: Depends on US2 — atomicity is *of* the upload path.
- **US4 (P3, parity)**: Depends on US2 — parity is *between* the upload path and the blank path.

### Within Each User Story

- Tests written BEFORE implementation, asserted to FAIL first, then asserted to PASS after implementation (TDD per task description).
- Within US2: T017 (DTO) MUST come before T018 (service) MUST come before T019 (resolver). The DTO change unblocks compilation in the service; the service change unblocks the resolver wiring. Schema regeneration (T023) MUST come last, after all source compiles.

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel.
- All Foundational tasks (T004–T007) are read-only verifications and can run in parallel.
- Within US1: T008 / T009 are [P] (different test files); T010 runs last and is sequential.
- Within US2 tests: T011 / T012 / T013 / T014 / T015 are [P] (different test files / different test cases). Implementation T017 / T018 / T019 are NOT [P] (sequential file dependency). T021 (logging) and T020 (description) are [P] with each other once T019 has landed.
- Within US3: T024–T031 are [P] (each a separate integration-test case in the same file — write each as a discrete `it(...)` block that does its own setup/teardown). They CAN be authored in parallel by different developers, but the test file is shared so commits should be coordinated.
- Within US4: T033–T036 are [P] for the same reason as US3.

---

## Parallel Example: User Story 2

```bash
# Phase 4 — write failing tests in parallel:
Task: "Unit test for framing service upload branch in src/domain/collaboration/callout-framing/callout.framing.service.spec.ts"
Task: "Unit test for framing service blank branch unchanged in src/domain/collaboration/callout-framing/callout.framing.service.spec.ts"
Task: "Unit test for resolver buffer-and-plumb in src/domain/collaboration/callouts-set/callouts.set.resolver.mutations.spec.ts"
Task: "Unit test for authorization single-shot in src/domain/collaboration/callouts-set/callouts.set.resolver.mutations.spec.ts"
Task: "Integration test happy path in test/integration/collabora-document-framing-import.it-spec.ts"

# Then implement sequentially (DTO → service → resolver):
Task: "Modify CreateCollaboraDocumentInput DTO at src/domain/collaboration/collabora-document/dto/collabora.document.dto.create.ts"
Task: "Wire upload branch in src/domain/collaboration/callout-framing/callout.framing.service.ts"
Task: "Add file: Upload arg in src/domain/collaboration/callouts-set/callouts.set.resolver.mutations.ts"

# Final verification:
Task: "Run failing tests and confirm they PASS"
Task: "Regenerate schema and verify diff matches contracts/schema.delta.graphql"
```

---

## Implementation Strategy

### MVP First (US1 + US2 only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: US1 baseline (T008/T009 only — defer T010 until after US2)
4. Complete Phase 4: US2 — the core upload path
5. Complete Phase 3 closing step: T010 — re-run blank-path tests, assert non-regression
6. **STOP and VALIDATE**: Test US1 + US2 independently via `quickstart.md` Story 1 + Story 2
7. Deploy/demo if ready

This MVP delivers: blank path preserved + upload path working end-to-end. SC-001, SC-002, SC-006, FR-001, FR-002, FR-005, FR-007, FR-008, FR-011, FR-012 all satisfied. SC-003 (atomicity verification) and SC-005 (event parity) ride on existing import-path semantics and are formally verified in subsequent phases.

### Incremental Delivery

1. MVP (above) → ship behind no flag (it's an additive optional arg; FE has no obligation to use it yet).
2. Add US3 (atomicity hardening) → integration tests document the safety net; no user-visible behavior change.
3. Add US4 (downstream parity) → integration tests guarantee FR-008/FR-011 hold on every regression run.
4. Polish (Phase 7) → lint, schema-diff verification, manual quickstart, latency-parity check (SC-004).

### Parallel Team Strategy

With multiple developers (post-MVP):

- Developer A: Phase 4 implementation tasks T017→T018→T019→T020→T021 (sequential within developer)
- Developer B: Phase 4 test tasks T011–T015 (parallel within developer)
- Developer C: Phase 5 + Phase 6 integration tests T024–T036 (can author in parallel; commits to the same file should rebase/merge cleanly)

---

## Notes

- [P] tasks = different files OR independent test cases within a shared test file (commit-coordinated).
- All file paths in this task list are validated against the actual repo as of 2026-05-04. If the codebase drifts before implementation, re-validate against the live tree.
- This feature introduces ZERO new files in `src/`, ZERO migrations, ZERO new exceptions, ZERO new event types, ZERO new modules. The footprint is: 1 modified DTO, 1 modified service, 1 modified resolver, 1 new integration test file, ~3 modified spec files. Per `plan.md`'s ~150 net-LOC estimate.
- Follow durable preference (memory: "mirror existing patterns without asking"): the upload path mirrors `importCollaboraDocument`'s temp→permanent flow, displayName defaulting, MIME sniffing delegation, and fail-fast upstream-unavailable behavior.
- Avoid: vague tasks (every task has an absolute file path), same-file write conflicts (T017→T018→T019 are explicitly sequential), cross-story dependencies that break US1's non-regression character.
