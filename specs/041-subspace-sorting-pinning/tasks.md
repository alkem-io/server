# Tasks: Subspace Sorting & Pinning API

**Input**: Design documents from `/specs/041-subspace-sorting-pinning/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Unit tests included for settings service (risk-based: covers the logic that merges settings updates).

**Organization**: Tasks grouped by user story. US3 (query exposure) is satisfied by foundational entity/interface changes and requires no separate tasks. US4 (backward compat) requires no code changes, only verification in the polish phase.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)
- Include exact file paths in descriptions

---

## Phase 1: Setup

**Purpose**: Create the new enum shared by multiple user stories

- [x] T001 Create `SpaceSortMode` enum with `ALPHABETICAL` and `CUSTOM` values, register with `registerEnumType`, in `src/common/enums/space.sort.mode.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Entity, interface, and migration changes that MUST be complete before user story work begins

**CRITICAL**: No user story work can begin until this phase is complete

- [x] T002 [P] Add `pinned` boolean column (NOT NULL, default false) to Space entity in `src/domain/space/space/space.entity.ts`
- [x] T003 [P] Add `pinned` field (`@Field(() => Boolean)`) to ISpace GraphQL interface in `src/domain/space/space/space.interface.ts`
- [x] T004 [P] Add `sortMode` field (`@Field(() => SpaceSortMode)`) to `ISpaceSettings` interface in `src/domain/space/space.settings/space.settings.interface.ts`
- [x] T005 Create migration `AddPinnedAndSortModeToSpace` in `src/migrations/`: add `pinned` boolean column to `space` table, backfill `sortMode: "alphabetical"` into JSONB `settings` column for all existing spaces; include reversible `down()` method

**Checkpoint**: Entity and database schema updated. `pinned` and `sortMode` fields are now exposed in GraphQL queries (US3 satisfied).

---

## Phase 3: User Story 1 - Configure Subspace Sort Mode (Priority: P1)

**Goal**: Space administrators can set and retrieve the sort mode (Alphabetical/Custom) via the existing `updateSpaceSettings` mutation.

**Independent Test**: Call `updateSpaceSettings` with `sortMode: CUSTOM`, then query the space settings and verify `sortMode` is `CUSTOM`. Query a space with no explicit sortMode and verify it defaults to `ALPHABETICAL`.

### Implementation for User Story 1

- [x] T006 [P] [US1] Add optional `sortMode: SpaceSortMode` field to `UpdateSpaceSettingsEntityInput` in `src/domain/space/space.settings/dto/space.settings.dto.update.ts`
- [x] T007 [P] [US1] Add optional `sortMode: SpaceSortMode` field to `CreateSpaceSettingsInput` in `src/domain/space/space.settings/dto/space.settings.dto.create.ts`
- [x] T008 [US1] Update `SpaceSettingsService.updateSettings()` to handle `sortMode` field (if provided, update `settings.sortMode`) in `src/domain/space/space.settings/space.settings.service.ts`
- [x] T009 [US1] Add unit tests for `sortMode` handling in `updateSettings()`: test setting to CUSTOM, setting to ALPHABETICAL, and omitting sortMode (should not change existing value), in `src/domain/space/space.settings/space.settings.service.spec.ts`
- [x] T010 [US1] Ensure `SpaceSettingsService` sets `sortMode` default to `SpaceSortMode.ALPHABETICAL` when creating new space settings (update creation logic if template does not provide a value), in `src/domain/space/space.settings/space.settings.service.ts`

**Checkpoint**: Sort mode can be read and updated via `updateSpaceSettings`. US1 fully functional.

---

## Phase 4: User Story 2 - Pin and Unpin Subspaces (Priority: P1)

**Goal**: Space administrators can pin/unpin individual subspaces via a new `updateSubspacePinned` mutation. Operations are idempotent.

**Independent Test**: Call `updateSubspacePinned` with `pinned: true` for a subspace, query it, verify `pinned: true`. Call again with `pinned: false`, verify `pinned: false`. Call with `pinned: true` twice, verify no error (idempotent).

### Implementation for User Story 2

- [x] T011 [P] [US2] Create `UpdateSubspacePinnedInput` DTO with `spaceID: UUID`, `subspaceID: UUID`, `pinned: Boolean` fields in `src/domain/space/space/dto/space.dto.update.subspace.pinned.ts`
- [x] T012 [US2] Add `updateSubspacePinned(space, pinnedData)` method to `SpaceService`: load parent space with subspaces, validate subspace belongs to parent, set `pinned` value, save subspace, return updated subspace, in `src/domain/space/space/space.service.ts`
- [x] T013 [US2] Add `updateSubspacePinned` mutation to `SpaceResolverMutations`: load parent space, check `AuthorizationPrivilege.UPDATE` on parent, delegate to service method, in `src/domain/space/space/space.resolver.mutations.ts`

**Checkpoint**: Subspaces can be pinned/unpinned via GraphQL mutation. US2 fully functional.

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Schema regeneration, backward compatibility verification, and final validation

- [x] T014 Regenerate and sort GraphQL schema: run `pnpm run schema:print && pnpm run schema:sort`, then `pnpm run schema:diff` to validate contract gate. Note: BREAKING changes require CODEOWNER approval with `BREAKING-APPROVED` label.
- [x] T015 Verify `updateSubspacesSortOrder` mutation still works unchanged (US4 backward compatibility): review that no changes affect `src/domain/space/space/space.service.ts` `updateSubspacesSortOrder` method
- [x] T016 Run full lint check: `pnpm lint`
- [x] T017 Run test suite: `pnpm test:ci:no:coverage`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 (T001) - BLOCKS all user stories
- **US1 (Phase 3)**: Depends on Phase 2 completion
- **US2 (Phase 4)**: Depends on Phase 2 completion; independent of US1
- **Polish (Phase 5)**: Depends on all user stories complete

### User Story Dependencies

- **US1 (Sort Mode)**: Depends on foundational only. No dependency on US2.
- **US2 (Pinning)**: Depends on foundational only. No dependency on US1.
- **US3 (Query Exposure)**: Satisfied by foundational Phase 2 (entity/interface changes automatically expose fields in queries). No separate tasks needed.
- **US4 (Backward Compat)**: No code changes needed. Existing `updateSubspacesSortOrder` is unaffected. Verified in polish phase (T015).

### Parallel Opportunities

- T002, T003, T004 can all run in parallel (different files)
- T006, T007 can run in parallel (different DTO files)
- T011 can run in parallel with US1 tasks (different files, no dependency)
- US1 (Phase 3) and US2 (Phase 4) can run in parallel after Phase 2

---

## Parallel Example: Foundational Phase

```text
# Launch all entity/interface changes together:
Task: T002 "Add pinned column to Space entity in src/domain/space/space/space.entity.ts"
Task: T003 "Add pinned field to ISpace interface in src/domain/space/space/space.interface.ts"
Task: T004 "Add sortMode field to ISpaceSettings in src/domain/space/space.settings/space.settings.interface.ts"

# Then migration (depends on entity changes):
Task: T005 "Create migration AddPinnedAndSortModeToSpace"
```

## Parallel Example: US1 + US2 (after foundational)

```text
# US1 DTOs (parallel):
Task: T006 "Add sortMode to UpdateSpaceSettingsEntityInput"
Task: T007 "Add sortMode to CreateSpaceSettingsInput"

# US2 DTO (parallel with US1):
Task: T011 "Create UpdateSubspacePinnedInput DTO"
```

---

## Implementation Strategy

### MVP First (US1 + US2 together, both P1)

1. Complete Phase 1: Setup (T001)
2. Complete Phase 2: Foundational (T002-T005)
3. Complete Phase 3: US1 Sort Mode (T006-T010)
4. Complete Phase 4: US2 Pinning (T011-T013)
5. **STOP and VALIDATE**: Both US1 and US2 are functional
6. Complete Phase 5: Polish (T014-T017)

### Incremental Delivery

1. Setup + Foundational → Schema and data model ready
2. US1 (Sort Mode) → Admins can configure sort mode → Testable independently
3. US2 (Pinning) → Admins can pin/unpin subspaces → Testable independently
4. Polish → Schema regenerated, tests pass, backward compat verified

---

## Notes

- US3 (query exposure) requires no implementation tasks - adding fields to entity (`space.entity.ts`) and interface (`space.interface.ts`) in Phase 2 automatically exposes them in GraphQL queries
- US4 (backward compat) requires no code changes - the existing `updateSubspacesSortOrder` method is not modified by any task
- The `pinned` field defaults to `false` for all spaces including L0 (root) spaces, where it is simply unused
- The migration backfills `sortMode: "alphabetical"` in JSONB for all existing spaces, ensuring FR-002
- No new NestJS modules are needed; all changes fit within existing `SpaceModule` and `SpaceSettingsModule`
