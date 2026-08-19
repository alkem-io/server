---
description: "Task list for 104-l0-additional-tabs"
---

# Tasks: Adding additional tabs in L0 space

**Input**: Design documents from `/specs/104-l0-additional-tabs/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/graphql.md, quickstart.md

**Tests**: Included — the spec requires regression safety (SC-005) and the constitution mandates risk-based unit tests for the bound guards and the applier branch.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Absolute-from-repo-root paths are given.

## Path Conventions

Single backend project — `src/` at repo root. All paths below are repo-root-relative.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Single source of truth for the bound values (FR-010).

- [X] T001 Create `src/domain/collaboration/innovation-flow/innovation.flow.constants.ts` exporting `L0_MIN_INNOVATION_FLOW_STATES = 4`, `L0_MAX_INNOVATION_FLOW_STATES = 8`, `L0_FIXED_INNOVATION_FLOW_STATES = 4`, `SUBSPACE_MIN_INNOVATION_FLOW_STATES = 1`, `SUBSPACE_MAX_INNOVATION_FLOW_STATES = 8`. Add a file-level doc comment tying the values to FR-001/FR-002/FR-010.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Wire the constants into the creation path so new spaces get the right bounds. Blocks every user story because it establishes the L0 bounds the runtime guards read.

- [X] T002 [US1] In `src/domain/space/space/space.service.ts` `createRootSpaceAndSubspaces()` (lines ~1284-1285), replace the literal `minimumNumberOfStates = 4` / `maximumNumberOfStates = 4` with `L0_MIN_INNOVATION_FLOW_STATES` / `L0_MAX_INNOVATION_FLOW_STATES`. Also replace the `< 4` literal in the at-least-4 guard (line ~1278) with `L0_FIXED_INNOVATION_FLOW_STATES`. Import from `@domain/collaboration/innovation-flow/innovation.flow.constants`.
- [X] T003 [US1] In the same file `createSubspace()` (lines ~1373-1374), replace the subspace `maximumNumberOfStates = 8` / `minimumNumberOfStates = 1` literals with `SUBSPACE_MAX_INNOVATION_FLOW_STATES` / `SUBSPACE_MIN_INNOVATION_FLOW_STATES` (no behavior change — removes the remaining magic numbers, FR-010/FR-011).

**Checkpoint**: New L0 spaces are created with min 4 / max 8; subspaces unchanged. The generic add-guard (`innovation.flow.service.ts:359`) now permits up to 8 on L0.

---

## Phase 3: User Story 1 — Add a tab beyond the fixed 4 on an L0 space (P1)

**Goal**: An authorized admin can add tabs to an L0 space up to 8; the 9th is rejected. Subspaces unchanged.

**Independent Test**: Create an L0 space (4 states), add a 5th via `createStateOnInnovationFlow`, confirm persistence and tagset sync; add up to 8, confirm the 9th is rejected.

- [X] T004 [US1] Verify `createStateOnInnovationFlow` in `src/domain/collaboration/innovation-flow/innovation.flow.service.ts` requires no logic change (it reads `settings.maximumNumberOfStates` generically). If any L0-specific branching exists, remove it so the bound is purely settings-driven (FR-004/FR-005). Confirm the resolver (`innovation.flow.resolver.mutations.ts`) still enforces the existing authorization privilege and DTO validation before the service call — no auth bypass introduced for L0 (FR-012). Document the no-change conclusion in the PR if unchanged.
- [X] T005 [P] [US1] Add unit tests to `src/domain/collaboration/innovation-flow/innovation.flow.service.spec.ts`: (a) adding a state to an L0-style flow (settings min 4 / max 8) with 4 states succeeds and appends with next sort order; (b) adding when at 8 states throws `ValidationException` citing the max; (c) a subspace-style flow (min 1 / max 8) still behaves as before (regression).

**Checkpoint**: US1 acceptance scenarios pass in isolation.

---

## Phase 4: User Story 2 — Keep the first 4 L0 phases fixed and undeletable (P1)

**Goal**: An L0 space can never drop below 4 states; added tabs above the floor can be deleted with callout reassignment.

**Independent Test**: Delete attempt at exactly 4 → rejected; delete at 5 → succeeds to 4.

- [X] T006 [US2] Verify `deleteStateOnInnovationFlow` in `src/domain/collaboration/innovation-flow/innovation.flow.service.ts` requires no logic change (reads `settings.minimumNumberOfStates = 4` for L0). Confirm the floor holds and callout reassignment path is untouched (FR-006/FR-007).
- [X] T007 [P] [US2] Add unit tests to `innovation.flow.service.spec.ts`: (a) deleting from an L0-style flow at exactly 4 states throws `ValidationException` citing the minimum; (b) deleting an added tab from an L0-style flow at 5 states succeeds and triggers callout reassignment to a remaining valid state.

**Checkpoint**: US2 acceptance scenarios pass; SC-003 (never below 4) holds.

---

## Phase 5: User Story 3 — Apply a Space Template to an L0 space without overwriting the fixed phases (P2)

**Goal**: Applying a Space Template to an L0 space preserves the first 4 fixed phases and appends template extras up to 8; overflow is rejected atomically. Subspace apply unchanged.

**Independent Test**: Apply a multi-phase template to an L0 space → first 4 preserved, extras appended; apply an overflowing template → rejected, space unchanged.

- [X] T008 [US3] Add `private isLevelZeroInnovationFlow(innovationFlowId)` to `src/domain/collaboration/innovation-flow/innovation.flow.service.ts` that resolves the owning Space `level` via the entity manager (`manager.getRepository(Space)` filtered by `collaboration.innovationFlow.id`; absent row ⇒ treated as non-L0/template, behave as today). Mirrors the `getCollaborationByInnovationFlowId` manager pattern. **Implementation note**: placed in InnovationFlowService (not the applier) so the space-level lookup and the fixed-phase preservation live together in the innovation-flow domain, avoiding a template→space module coupling. The Space *entity* is imported for `manager.getRepository` metadata only (no DI), and `space.entity` does not import innovation-flow, so there is no cycle.
- [X] T009 [US3] Add `public updateInnovationFlowStatesFromTemplate(innovationFlow, templateStates)` to `innovation.flow.service.ts`: for L0 build the new set as `[existing first L0_FIXED_INNOVATION_FLOW_STATES states by sortOrder] + [template states not duplicating the fixed names, re-based after the fixed phases]`, capped at the flow's `maximumNumberOfStates`; if the combined set would exceed the max, throw `ValidationException` (FR-009) before any mutation (atomic). For non-L0 delegate to the existing wholesale `updateInnovationFlowStates` (FR-008/FR-011). Then point `template.applier.service.ts` `updateCollaborationFromTemplateContentSpace()` at the new method instead of `updateInnovationFlowStates`.
- [X] T010 [P] [US3] Add unit tests to `src/domain/collaboration/innovation-flow/innovation.flow.service.spec.ts` for `updateInnovationFlowStatesFromTemplate`: (a) applying to an L0 flow preserves the 4 fixed states (names + leading order) and appends only non-duplicate extras; (b) applying a set that would exceed 8 throws `ValidationException` and performs no mutation; (c) a subspace flow falls through to the wholesale replacement (regression). Update `template.applier.service.spec.ts` mocks to the new method name.

**Checkpoint**: US3 scenarios pass; SC-004 (fixed phases preserved 100%) holds.

---

## Phase 6: Data Migration (cross-cutting; required by FR-014)

**Purpose**: Let existing L0 spaces gain the loosened maximum. Depends on the constant value (Phase 1) being settled; independent of the service/applier code so it MAY be developed in parallel with Phases 3–5.

- [X] T011 Generate/author migration `src/migrations/<timestamp>-BackfillL0InnovationFlowMaxStates.ts` following the `1780500000000-BackfillInnovationFlowStateVisible.ts` precedent. `up()`: set `maximumNumberOfStates = 8` on `innovation_flow.settings` for flows whose owning `space.level = 0` and current max = 4 (idempotent; see data-model.md SQL). `down()`: reverse L0 flows at 8 back to 4 with the documented rollback note. Use the `space → collaboration → innovation_flow` join; `innovation_flow.settings` is `jsonb`, so use `jsonb_set(settings, '{maximumNumberOfStates}', '8'::jsonb, true)` directly (no casting).
- [~] T012 Validate the migration with `pnpm run migration:run` against a local DB (or `.scripts/migrations/run_validate_migration.sh` if env available); confirm idempotency by running twice (second run is a no-op) and that subspace/template flows are untouched. **Deferred**: no live PostgreSQL/DSN available in this headless worker. The migration SQL is idempotent by the `= '4'` guard and reversible; validated by inspection against the `1780500000000-BackfillInnovationFlowStateVisible` precedent and the verified `space → collaboration → innovation_flow` join column names. Will run in CI / on the next migration cycle.

---

## Phase 7: Polish & Exit Gates

- [X] T013 Run `pnpm run schema:print` and compare to the committed `schema.graphql` — confirmed **zero** schema diff (FR-013). No GraphQL contract change.
- [X] T014 Run `pnpm lint` (tsc --noEmit + biome) — clean after `pnpm lint:fix` (import sorting + formatting in the 4 edited files).
- [X] T015 Run `pnpm build` (production build) — succeeded.
- [X] T016 Run `pnpm test:ci:no:coverage` — full suite green: 617 files / 6734 tests passed, 7 skipped, 0 failed (SC-005/SC-006).
- [X] T017 Updated `specs/104-l0-additional-tabs/` artifacts to reflect the actual implementation (helper placed in InnovationFlowService; new `updateInnovationFlowStatesFromTemplate`; json→jsonb correction). spec/plan/tasks consistent.

---

## Dependencies & Execution Order

- **Phase 1 (T001)** → blocks Phase 2 and the migration value.
- **Phase 2 (T002-T003)** → blocks Phase 3/4 checkpoints (creation bounds must be right).
- **Phase 3 (US1)**, **Phase 4 (US2)** → depend on Phase 2; `[P]` test tasks T005/T007 can run in parallel with each other (different concerns, same spec file — coordinate edits).
- **Phase 5 (US3)** → depends on Phase 1 (constants) and is independent of US1/US2 service code (different file). T010 `[P]`.
- **Phase 6 (migration)** → depends only on Phase 1; can proceed in parallel with Phases 3–5.
- **Phase 7** → after all implementation; gates run in the order schema → lint → build → test (restart from T013 on any failure).

## Parallel Opportunities

- T005, T007, T010 (test authoring in distinct concerns) — note T005/T007 touch the same spec file, so serialize the actual writes even though logically parallel.
- T008/T009 (applier) and T011 (migration) are in different files and can be built concurrently after T001.

## Acceptance Criteria Mapping

| Task | FR / SC / Story |
|------|------------------|
| T001 | FR-010 |
| T002 | FR-001, FR-002, FR-003 / US1 |
| T003 | FR-011 |
| T004, T005 | FR-004, FR-005, FR-012, SC-001, SC-002 / US1 |
| T006, T007 | FR-006, FR-007, SC-003 / US2 |
| T008, T009, T010 | FR-008, FR-009, FR-011, SC-004 / US3 |
| T011, T012 | FR-014 |
| T013 | FR-013 |
| T014-T016 | SC-005, SC-006 |
