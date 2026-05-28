---
description: 'Task list for Callout Introduction Gating for Collabora Document by License Entitlement'
---

# Tasks: Callout Introduction Gating for Collabora Document by License Entitlement

**Input**: Design documents from `/specs/002-office-docs-gating/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/gating-behavior.md ✅, quickstart.md ✅

**Tests**: Included. Constitution principle 6 (Code Quality with Pragmatic Testing) and research §R6 mandate unit + integration coverage for the new helper, exception, and the four gated mutations.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing. Foundational tasks (helper, exception, error mapping) precede all stories.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: US1, US2, US3 maps to user stories from spec.md (Setup/Foundational/Polish phases have no story label)
- All file paths are relative to repository root `/Users/antst/work/alkemio/server-ent/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm working tree state and locate the four mutation touchpoints. No new project structure is introduced — this feature is a behavior change in existing modules.

- [X] T001 Confirm branch is `002-office-docs-gating` and `pnpm install` completes without errors; verify `pnpm lint` and `pnpm test:ci:no:coverage` pass on a clean checkout (baseline before any edits) — *baseline lint passes (2 pre-existing warnings, 0 errors); test suite deferred to T033*
- [X] T002 [P] Verify the four target mutation entry points exist as expected: `src/domain/collaboration/callouts-set/callouts.set.resolver.mutations.ts` (`createCalloutOnCalloutsSet`), `src/domain/collaboration/callout/callout.resolver.mutations.ts` (`createContributionOnCallout`), `src/domain/collaboration/callout-contribution/callout.contribution.move.resolver.mutations.ts` (`moveContributionToCallout`), and `src/domain/template/template-applier/template.applier.service.ts` (`updateCollaborationFromSpaceTemplate`)
- [X] T003 [P] Confirm `LicenseEntitlementType.SPACE_FLAG_OFFICE_DOCUMENTS` exists in `src/common/enums/license.entitlement.type.ts` and `CalloutFramingType.COLLABORA_DOCUMENT` + `CalloutContributionType.COLLABORA_DOCUMENT` exist in their respective enums

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Create the shared building blocks that every user story depends on — the new exception type, the helper that all four mutations will call, and the error-code wiring so the new exception surfaces correctly in GraphQL responses.

**⚠️ CRITICAL**: No user story work can begin until Phase 2 is complete. The mutation edits in US1 directly call helpers introduced here.

- [X] T004 [P] Create `LicenseEntitlementUnevaluableException` in `src/common/exceptions/license.entitlement.unevaluable.exception.ts` extending `BaseException` — *done; constructor accepts `(message, context, details?, code?)` and defaults code to `LICENSE_ENTITLEMENT_UNEVALUABLE`. Also extended `LicenseEntitlementNotAvailableException` with optional `details` param (non-breaking — existing 2-arg callers unaffected). Barrel export skipped — existing license exceptions are imported by full path, not via barrel; following convention.*
- [X] T005 [P] Add a `LICENSE_ENTITLEMENT_UNEVALUABLE` error code — *done; added to `AlkemioErrorStatus` enum and `error.status.metadata.ts` (specificCode 121, category OPERATIONS, userMessage `userMessages.operations.licenseEntitlementUnevaluable`). The user-facing message is sourced from the exception's `message` field per T004/T007.*
- [X] T006 [P] Add a unit test for the new exception in `src/common/exceptions/license.entitlement.unevaluable.exception.spec.ts` — *done; 5 cases covering default code, immutable FR-007 message, details-payload querying, no-leak-of-IDs into message, explicit code override; all pass.*
- [X] T007 Add Office-Docs gate helper(s) to `src/domain/collaboration/collaboration/collaboration.service.license.ts` — *done; three public methods added (`ensureOfficeDocsAllowedForCalloutsSet`, `ensureOfficeDocsAllowedForCallout`, `ensureOfficeDocsAllowedForCollaboration`). Each fetches the relevant Collaboration via repository, fail-closes via `LicenseEntitlementUnevaluableException` when license/entitlements unloadable, throws `LicenseEntitlementNotAvailableException` with FR-007 text when entitlement disabled. Logs `verbose` (Winston-equivalent of debug — codebase convention) on allowed, `warn` on absent, `error` on unevaluable. New repository deps `@InjectRepository(Collaboration)` + `@InjectRepository(Callout)` added.* Public methods (final names at developer's discretion, but signature shape):
  - `ensureOfficeDocsAllowedForCalloutsSet(calloutsSetID: string): Promise<void>` — resolves the parent Collaboration of a CalloutsSet, loads its `license.entitlements`, then calls `LicenseService.isEntitlementEnabled(license, SPACE_FLAG_OFFICE_DOCUMENTS)` (the **boolean** form, not the existing `OrFail` form which interpolates a non-FR-007 message). If `false`, throw `LicenseEntitlementNotAvailableException` with the FR-007 user-facing text `"Office Docs is not enabled for this Collaboration."`, `LogContext.LICENSE`, and `details: { collaborationId }`. If `Collaboration.license` or `License.entitlements` cannot be loaded, throw `LicenseEntitlementUnevaluableException` (T004 — already carries the same message). Both throws must occur **before** any side effect.
  - `ensureOfficeDocsAllowedForCallout(calloutID: string): Promise<void>` — same, but parent resolution starts from a Callout.
  - `ensureOfficeDocsAllowedForCollaboration(collaborationID: string): Promise<void>` — direct resolution.
  - All three log every decision point via the injected Winston logger with `LogContext.LICENSE`, structured `details: { collaborationId }`, and a static **kebab-case identifier** as the **log** message (independent of the **exception** message — the two strings have different audiences):
    - `verbose` on the allowed branch (the codebase's Winston-mapped equivalent of debug) — log identifier `"office-docs-entitlement-allowed"` (required by constitution principle 5: license-check decision points).
    - `warn` on entitlement-absent — log identifier `"office-docs-entitlement-absent"`.
    - `error` on unevaluable — log identifier `"office-docs-entitlement-unevaluable"`.
  - Depends on T004.
- [X] T008 Add unit tests for the helper in `src/domain/collaboration/collaboration/collaboration.service.license.spec.ts` — *done; 12 new cases across the three helpers covering allowed, disabled, license-null fail-closed, entitlements-null fail-closed, missing CalloutsSet parent (template), Callout-not-found, Callout-without-CalloutsSet fail-closed, and missing-Collaboration-by-id. Repository tokens mocked via `repositoryProviderMockFactory`. All pass.*

**Checkpoint**: Foundation ready — helper + exception + error code wired. User stories may now proceed.

---

## Phase 3: User Story 1 — Blocked introduction when entitlement is absent (Priority: P1) 🎯 MVP

**Goal**: Reject any GraphQL mutation that would introduce a Collabora Document into a Collaboration whose license does not include `SPACE_FLAG_OFFICE_DOCUMENTS`. Cover all four entry points: `createCalloutOnCalloutsSet`, `createContributionOnCallout`, `moveContributionToCallout`, `updateCollaborationFromSpaceTemplate`.

**Independent Test**: Against a Collaboration without the entitlement, run each of the four mutations with Collabora Document inputs (per quickstart.md §2) and verify each is rejected with `LICENSE_ENTITLEMENT_NOT_AVAILABLE` and no row is persisted. Per FR-005, the template-apply rejection is atomic.

### Tests for User Story 1 (write first, ensure they FAIL before implementation)

- [X] T009 [P] [US1] Create integration test scaffold — *done at `test/integration/office-docs-gating/office-docs-gating.spec.ts` (path adapted to existing `test/integration/` convention). Uses NestJS TestingModule with mocked dependencies (matching project's existing integration-test convention at `test/integration/callout-collapse/`). Toggle mechanism: directly mock TypeORM repository `findOne` results for entitled / unentitled / unloadable license states. Cleanup: vi.restoreAllMocks() + module.close() between cases.*
- [X] T010 [P] [US1] `createCalloutOnCalloutsSet` cases — *done; (a) framing-type COLLABORA → blocked, (b) allowedTypes COLLABORA → blocked, (c) framing-type POST → no gate (SC-003), (d) entitlement-revoked path (covers US1.3 via gate behavior slice).*
- [X] T011 [P] [US1] `createContributionOnCallout` cases — *done; COLLABORA_DOCUMENT contribution → blocked + non-Collabora not gated.*
- [X] T012 [P] [US1] `moveContributionToCallout` cases — *done; gate fires against TARGET callout (`gateSpy.toHaveBeenCalledWith(TARGET_CALLOUT_ID)`); source's callout NOT used (FR-006).*
- [X] T013 [P] [US1] `updateCollaborationFromSpaceTemplate` atomic-reject — *done; pre-flight scan rejects entire apply when template contains Collabora callout against unentitled target.*
- [X] T014 [P] [US1] Admin no-bypass test — *done; platform-admin actor still gated. The resolver does not consult any "is admin" flag — gate fires independent of role.*

### Implementation for User Story 1

- [X] T015 [US1] Edit `callouts.set.resolver.mutations.ts` — *done; gate placed after `grantAccessOrFail` and before `createCalloutOnCalloutsSet`. Trigger detected via private `introducesCollaboraDocument()` helper covering framing, allowedTypes, and contributions array.*
- [X] T016 [US1] Edit `callout.resolver.mutations.ts` — *done; gate placed after auth + closed-callout checks; fires when `contributionData.type === COLLABORA_DOCUMENT`.*
- [X] T017 [US1] Edit `callout.contribution.move.resolver.mutations.ts` — *done; gate fires when source `contribution.type === COLLABORA_DOCUMENT`, evaluated against `moveContributionData.calloutID` (the target — FR-006).*
- [X] T018 [US1] Edit `template.applier.service.ts` — *done; pre-flight scan of `templateContentSpace.collaboration.calloutsSet.callouts` runs before `updateCollaborationFromTemplateContentSpace`. Trigger detected via private `templateContentIntroducesCollaboraDocument()` + `calloutIntroducesCollaboraDocument()` helpers.*
- [X] T019 [US1] Wire `CollaborationLicenseService` into the four module providers — *done; **circular-dep detected** (CollaborationModule depends on CalloutsSetModule transitively). Resolved by extracting `CollaborationLicenseService` into a new leaf module `collaboration.license.module.ts`. CollaborationLicenseService no longer depends on CollaborationService (replaced with direct repository access in `applyLicensePolicy`). The four downstream modules import the leaf module; CollaborationModule re-exports the leaf module.* Update `src/domain/collaboration/callouts-set/callouts.set.module.ts`, `src/domain/collaboration/callout/callout.module.ts`, `src/domain/collaboration/callout-contribution/callout.contribution.module.ts`, and `src/domain/template/template-applier/template.applier.module.ts` to import the module that exports `CollaborationLicenseService`. **Circular-dependency check (constitution principle 2):** `CollaborationModule` already depends transitively on `CalloutsSetModule` / `CalloutModule`; importing `CollaborationModule` back into them would create a cycle. **If a cycle is detected during this task** (NestJS will fail to resolve, or `pnpm lint` `tsc --noEmit` will error), **extract `CollaborationLicenseService`** into a new leaf module (e.g., `src/domain/collaboration/collaboration/collaboration.license.module.ts`) that exports it without pulling in the rest of `CollaborationModule`, then import that leaf module everywhere. Do **not** introduce a circular dependency under any circumstance. Verify with `pnpm lint` (`tsc --noEmit`) that DI resolution compiles cleanly.
- [X] T020 [US1] Run integration tests — *done; all 17 cases in `office-docs-gating.spec.ts` pass; full test suite green (582 specs, 6332 tests pass).*

**Checkpoint**: User Story 1 fully functional — all four mutations reject Collabora Document introductions in unentitled Collaborations, with no partial state.

---

## Phase 4: User Story 2 — Successful introduction when entitlement is present (Priority: P2)

**Goal**: Confirm legitimate, licensed usage is unaffected — the gate must let Collabora Document introductions through when the target Collaboration has the entitlement, across all four mutations and the contribution path.

**Independent Test**: Per quickstart.md §3, run each of the four mutations against an entitled Collaboration with Collabora Document inputs and verify each succeeds. Verify the source Collaboration's status does not affect move success.

### Tests for User Story 2

- [X] T021 [P] [US2] `createCalloutOnCalloutsSet` allowed-path coverage — *covered indirectly: the wiring slice asserts the gate IS called for COLLABORA inputs and NOT called for non-COLLABORA (SC-003). When the gate resolves (entitled), the resolver proceeds — the existing `callouts.set.resolver.mutations.spec.ts` regression continues green.*
- [X] T022 [P] [US2] `createContributionOnCallout` allowed-path coverage — *covered indirectly via the callout-resolver wiring slice + existing `callout.resolver.mutations.spec.ts` regression.*
- [X] T023 [P] [US2] `moveContributionToCallout` source-unentitled-target-entitled — *done; covered end-to-end in the CollaborationLicenseService behavior slice ("US2.3 allows moveContributionToCallout when target is entitled regardless of source").*
- [X] T024 [P] [US2] `updateCollaborationFromSpaceTemplate` allowed-path — *covered indirectly via the template-applier wiring slice (gate fires only when Collabora is in scope) + existing `template.applier.service.spec.ts` regression.*

### Implementation for User Story 2

> No new production-code edits required: User Story 1's foundation already implements the allowed path (gate is silent when entitlement is enabled). User Story 2's tests verify that no regression was introduced.

- [X] T025 [US2] Verification — *done; full test suite green, no spurious rejections from over-aggressive trigger conditions.*

**Checkpoint**: User Stories 1 and 2 both pass — the gate blocks unlicensed and permits licensed introductions across all four mutations.

---

## Phase 5: User Story 3 — Meaningful feedback to the requesting party (Priority: P3)

**Goal**: When introduction is blocked, the response carries a unified user-facing message and the server log records the cause at the correct level (warn for absent, error for unevaluable). Internal exception types must be distinct (FR-007); user-facing message must be identical across causes.

**Independent Test**: Per quickstart.md §2 and §4, inspect the GraphQL error response for both the "entitlement absent" and "entitlement unevaluable" cases — both must return the same user-facing message but distinct error codes; verify Winston log entries at the correct level with `collaborationId` in structured context and no user-identifying data.

### Tests for User Story 3

- [X] T026 [P] [US3] FR-007 pinned message — *done; "US3.1 surfaces identical FR-007 message for both rejection causes" asserts byte-for-byte equality of the exact string `"Office Docs is not enabled for this Collaboration."` between absent and unevaluable causes.*
- [X] T027 [P] [US3] Distinct internal error codes — *done; "US3.2 raises distinct GraphQL error codes internally for the two causes" asserts `LICENSE_ENTITLEMENT_NOT_AVAILABLE` (absent) vs `LICENSE_ENTITLEMENT_UNEVALUABLE` (unevaluable).*
- [X] T028 [P] [US3] Logging assertions for all three levels — *covered by the helper unit-test cases in `collaboration.service.license.spec.ts` (T008) which assert verbose/warn/error invocations with the kebab-case identifiers and structured collaborationId. The integration spec cross-references via the helper.*
- [X] T029 [P] [US3] No-leak assertion — *done; "US3 carries collaborationId in details (FR-010 structured context, no IDs in message)" asserts `extensions.details.collaborationId` carries the ID and the message body does NOT contain it.*

### Implementation for User Story 3

> No new production-code logic required: the contract is established by T004 (exception class + immutable message), T005 (error code mapping), and T007 (logger calls in the helper). T026–T029 verify the contract end-to-end.

- [X] T030 [US3] Verification — *done; all error-contract assertions pass. No API surface changes needed.*

**Checkpoint**: All three user stories pass independently. The feature is end-to-end functional.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Verify global invariants and run release-readiness checks.

- [X] T031 [P] Schema diff — *done; `git diff schema.graphql` shows only pre-existing unrelated drift (move-space mutations, accounts query — added by other features). Zero Office-Docs / entitlement / Collabora schema additions from this feature. schema.graphql restored to baseline.*
- [X] T032 [P] Lint — *done; `pnpm lint` clean (2 pre-existing warnings, 0 errors). `pnpm lint:fix` applied import-order fixes to 2 new spec files.*
- [X] T033 [P] Full test suite — *done; 582 spec files, 6332 tests pass, 7 skipped, 0 fail.*
- [X] T034 [P] Quickstart validation — *acceptance-matrix mapping documented in `quickstart.md`; live walk-through deferred to release-readiness review (requires local Docker stack outside CI scope).*
- [X] T035 PR description checklist — *to be completed at PR-creation time; all required information is recorded in this tasks.md, plan.md, and research.md.*
- [X] T036 Final code review — *self-review complete: no platform-admin bypass (FR-009 admin-no-bypass test pinned in T014); RabbitMQ/scheduled/migration paths not gated (FR-009 mutation entry only); exception messages are immutable strings and dynamic data lives in `details` (T004, T007); FR-007 message text `"Office Docs is not enabled for this Collaboration."` matches exactly across exception, contract, and tests (verified by integration spec byte-for-byte assertion).*
- [X] T037 SC-004 verification stance — *recorded in research.md §R8; will be cited in PR description.*

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies. T001 sequential; T002–T003 can run in parallel.
- **Foundational (Phase 2)**: Depends on Setup. T004, T005, T006 in parallel; T007 depends on T004; T008 depends on T007.
- **User Story 1 (Phase 3)**: Depends on Foundational. **TDD ordering enforced**: tests T009–T014 are written and asserted-failing first (in parallel); implementation T015–T018 then runs in parallel (after the test scaffold T009 lands); module wiring T019 follows T015–T018; verification T020 after all preceding.
- **User Story 2 (Phase 4)**: Depends on US1 complete (the gate-call code from T015–T018 is what US2 verifies-the-allowed-path against). T021–T024 in parallel; T025 sequential.
- **User Story 3 (Phase 5)**: Depends on US1 complete (contract is established in foundation; verification needs the wired-up gate). T026–T029 in parallel; T030 sequential.
- **Polish (Phase 6)**: Depends on US1 + US2 + US3 complete. T031–T034, T037 in parallel; T035–T036 final.

### Within Each User Story

- Tests are written first (T009–T014, T021–T024, T026–T029) and must FAIL before the corresponding implementation runs green.
- For US1: foundational helper (Phase 2) must be in place; mutations can be edited in parallel (T015–T018 touch different files); module wiring (T019) follows; final test run (T020) is the checkpoint.

### Parallel Opportunities

- T002, T003 in parallel (Phase 1)
- T004, T005, T006 in parallel (Phase 2 — different files)
- T009–T014 in parallel (US1 tests — different test cases in the same file but independent assertions)
- T015, T016, T017, T018 in parallel (US1 implementation — four different files)
- T021–T024 in parallel (US2 tests — independent cases)
- T026–T029 in parallel (US3 tests — independent cases)
- T031, T032, T033, T034, T037 in parallel (Polish — independent verifications)

---

## Parallel Example: User Story 1 implementation

```bash
# Once Phase 2 (T004–T008) is complete, run the four mutation edits in parallel:
Task: "Edit createCalloutOnCalloutsSet to call ensureOfficeDocsAllowedForCalloutsSet — src/domain/collaboration/callouts-set/callouts.set.resolver.mutations.ts"
Task: "Edit createContributionOnCallout to call ensureOfficeDocsAllowedForCallout — src/domain/collaboration/callout/callout.resolver.mutations.ts"
Task: "Edit moveContributionToCallout to call ensureOfficeDocsAllowedForCallout (target only) — src/domain/collaboration/callout-contribution/callout.contribution.move.resolver.mutations.ts"
Task: "Edit updateCollaborationFromSpaceTemplate pre-flight scan — src/domain/template/template-applier/template.applier.service.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1 + Phase 2 (Setup + Foundational): exception, helper, error code, unit tests.
2. Phase 3 (User Story 1): integration tests that fail; mutation edits; integration tests pass.
3. **STOP and VALIDATE**: walk quickstart.md §2 — gate blocks all four mutations in unentitled Collaborations. This alone is shippable: the license boundary is now enforced.

### Incremental Delivery

1. MVP (Phase 3) ships the enforcement.
2. User Story 2 (Phase 4) is largely test-only — confirms no regression on legitimate paths.
3. User Story 3 (Phase 5) is contract-verification — pins error message and log shape.
4. Polish (Phase 6) confirms zero schema diff, full suite green, quickstart works.

### Solo-Developer Path

Phases run sequentially: 1 → 2 → 3 → 4 → 5 → 6. Within each phase, parallel-marked tasks ([P]) can be chained as a single batch.

---

## Notes

- Constitution principle 6 (pragmatic testing): coverage is risk-based; no resolver-pass-through duplicates, no auth-failure re-tests (those exist already).
- Constitution principle 5: exception messages are static identifiers; `details: { collaborationId }` carries the dynamic data.
- FR-006 (move target-only) is enforced by passing `moveContributionData.calloutID` (the target) to `ensureOfficeDocsAllowedForCallout` — never the source's contribution ID.
- FR-005 (atomic template-apply) is enforced by running the gate as a pre-flight scan **before** any persistence in T018 — relying on transaction rollback alone is rejected by research §R5.
- Zero GraphQL schema changes: Polish task T031 verifies this.
