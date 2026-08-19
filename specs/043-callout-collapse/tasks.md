# Tasks: Callout Description Display Mode Setting

**Input**: Design documents from `/specs/043-callout-collapse/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/

**Tests**: Not explicitly requested in the feature specification. Omitted per pragmatic testing principle.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Foundational (Shared Types & DTOs)

**Purpose**: Create the enum, interface, and DTO types that all user stories depend on. No behavior changes yet — only type definitions.

**CRITICAL**: No user story work can begin until this phase is complete.

- [x] T001 [P] Create `CalloutDescriptionDisplayMode` enum with values `COLLAPSED` and `EXPANDED` in `src/common/enums/callout.description.display.mode.ts` — follow the `SpaceSortMode` pattern: lowercase string values, `registerEnumType()` call
- [x] T002 [P] Create `ISpaceSettingsLayout` GraphQL ObjectType interface in `src/domain/space/space.settings/space.settings.layout.interface.ts` — abstract class with `@ObjectType('SpaceSettingsLayout')`, single field `calloutDescriptionDisplayMode: CalloutDescriptionDisplayMode` (non-null)
- [x] T003 [P] Create `CreateSpaceSettingsLayoutInput` DTO in `src/domain/space/space.settings/dto/space.settings.layout.dto.create.ts` — `@InputType()` with optional `calloutDescriptionDisplayMode` field
- [x] T004 [P] Create `UpdateSpaceSettingsLayoutInput` DTO in `src/domain/space/space.settings/dto/space.settings.layout.dto.update.ts` — `@InputType()` with optional `calloutDescriptionDisplayMode` field
- [x] T005 Add `layout` field (`ISpaceSettingsLayout`, non-null) to `ISpaceSettings` in `src/domain/space/space.settings/space.settings.interface.ts` — import and add `@Field` with description `'The layout settings for this Space.'`
- [x] T006 [P] Add optional `layout` field (`CreateSpaceSettingsLayoutInput`) to `CreateSpaceSettingsInput` in `src/domain/space/space.settings/dto/space.settings.dto.create.ts`
- [x] T007 [P] Add optional `layout` field (`UpdateSpaceSettingsLayoutInput`) to `UpdateSpaceSettingsEntityInput` in `src/domain/space/space.settings/dto/space.settings.dto.update.ts`

**Checkpoint**: All types compile. `pnpm build` succeeds. No runtime behavior changes yet.

---

## Phase 2: User Story 1 — Space Admin Configures Callout Display Mode (Priority: P1) MVP

**Goal**: Space admins can update the callout display mode via `updateSpaceSettings` mutation and query it back via both the `settings` resolver and a public `layout` field resolver.

**Independent Test**: Call `updateSpaceSettings` with `layout: { calloutDescriptionDisplayMode: COLLAPSED }`, then query `space.settings.layout.calloutDescriptionDisplayMode` and verify it returns `COLLAPSED`.

### Implementation for User Story 1

- [x] T008 [US1] Add layout merge logic to `updateSettings()` in `src/domain/space/space.settings/space.settings.service.ts` — add `if (updateData.layout) { settings.layout = updateData.layout; }` block following the `membership`/`collaboration` full-replacement pattern
- [x] T009 [US1] Add `layout` field resolver on `Space` (public, no READ privilege) in `src/domain/space/space/space.resolver.fields.ts` — follow the `sortMode` resolver pattern: `@ResolveField('layout', () => ISpaceSettingsLayout)`, lazy-load space if needed, return `EXPANDED` as default fallback
- [x] T010 [US1] Update the `settings` field resolver in `src/domain/space/space/space.resolver.fields.ts` — ensure the returned settings object includes `layout` with a defensive default of `{ calloutDescriptionDisplayMode: EXPANDED }` when the field is missing, following the `sortMode` spread pattern

**Checkpoint**: `updateSpaceSettings` mutation accepts `layout` input and persists it. Both `space.layout` and `space.settings.layout` resolvers return the value with correct defaults. Verify via GraphQL Playground.

---

## Phase 3: User Story 2 — Default Display Mode for New Spaces (Priority: P1)

**Goal**: Newly created spaces default to `EXPANDED` callout description display mode without requiring explicit configuration.

**Independent Test**: Create a new space via `createSpace` mutation without specifying layout settings, then query `space.settings.layout.calloutDescriptionDisplayMode` and verify it returns `EXPANDED`.

### Implementation for User Story 2

- [x] T011 [US2] Set the creation default in `SpaceSettingsService.applyCreationDefaults()` (`src/domain/space/space.settings/space.settings.service.ts`) — after template settings are applied, set `calloutDescriptionDisplayMode: CalloutDescriptionDisplayMode.EXPANDED` if not already present, following the `sortMode` default pattern
- [x] T011b [US2] Migration `DefaultPlatformTemplatesCalloutExpanded` — force `layout.calloutDescriptionDisplayMode = 'expanded'` on the four platform-level default templates (`platform-space`, `platform-subspace`, `platform-subspace-knowledge`, `platform-space-tutorials`) so platform-provisioned new spaces default to `EXPANDED` independent of the code fallback

**Checkpoint**: New spaces and subspaces are created with `layout.calloutDescriptionDisplayMode = EXPANDED`. Verify via creating a space and querying settings.

---

## Phase 4: User Story 3 — Backward Compatibility for Existing Spaces (Priority: P1)

**Goal**: All existing spaces are backfilled with `EXPANDED` display mode so current behavior is preserved after deployment.

**Independent Test**: Run migration against a database with existing spaces, then query their settings to confirm `calloutDescriptionDisplayMode` is `EXPANDED`.

### Implementation for User Story 3

- [x] T012 [US3] Create migration `AddLayoutSettingsToSpace` in `src/migrations/` — `up`: use `jsonb_set("settings", '{layout}', '{"calloutDescriptionDisplayMode": "expanded"}')` where `"settings" ->> 'layout' IS NULL`; `down`: use `"settings" - 'layout'` where `"settings" ->> 'layout' IS NOT NULL`

**Checkpoint**: Migration applies cleanly on existing database. All existing spaces have `layout.calloutDescriptionDisplayMode = "expanded"` in their JSONB settings. Migration reverts cleanly.

---

## Phase 5: User Story 4 — Independent Subspace Configuration (Priority: P2)

**Goal**: Each space and subspace stores its own `layout.calloutDescriptionDisplayMode` independently with no inheritance from parent to child.

**Independent Test**: Set parent space to `COLLAPSED` and subspace to `EXPANDED`, query both and verify they return their independent values.

### Implementation for User Story 4

> **Note**: No additional code changes required. Independent subspace configuration is inherent in the architecture — each space row has its own `settings` JSONB column. The creation default (T011) applies to subspaces the same way as root spaces. The migration (T012) backfills all existing spaces including subspaces. This story is satisfied by the combined work from US1–US3.

**Checkpoint**: Verify by setting different display modes on a parent space and subspace, then querying both to confirm independent values.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Schema validation, build verification, and cleanup.

- [x] T013 Regenerate and sort the GraphQL schema by running `pnpm run schema:print && pnpm run schema:sort` — verify `CalloutDescriptionDisplayMode` enum, `SpaceSettingsLayout` type, and `layout` fields appear correctly
- [x] T014 Run `pnpm lint` to verify no lint errors
- [x] T015 Run `pnpm build` to verify clean compilation
- [x] T016 Run `pnpm test:ci:no:coverage` to verify no existing tests are broken

---

## Dependencies & Execution Order

### Phase Dependencies

- **Foundational (Phase 1)**: No dependencies — start immediately
- **US1 (Phase 2)**: Depends on Phase 1 completion — core mutation/query functionality
- **US2 (Phase 3)**: Depends on Phase 1 completion — can run in parallel with US1
- **US3 (Phase 4)**: Depends on Phase 1 completion — can run in parallel with US1 and US2
- **US4 (Phase 5)**: No additional code — validated after US1–US3 complete
- **Polish (Phase 6)**: Depends on all implementation phases complete

### User Story Dependencies

- **US1 (P1)**: Depends on Foundational (Phase 1) only — no cross-story dependencies
- **US2 (P1)**: Depends on Foundational (Phase 1) only — independent of US1
- **US3 (P1)**: Depends on Foundational (Phase 1) only — independent of US1/US2
- **US4 (P2)**: No code tasks — validated after US1–US3

### Within Each Phase

- Phase 1: T001–T004 can all run in parallel (different files). T005 depends on T002 (imports interface). T006–T007 depend on T003/T004 (import DTOs).
- Phase 2: T008 → T009 → T010 (sequential within service → resolver)
- Phase 3: T011 is a single task
- Phase 4: T012 is a single task

### Parallel Opportunities

- T001, T002, T003, T004 — all create new files, fully parallel
- T006, T007 — modify different files, parallel after T003/T004
- US1, US2, US3 implementation phases can run in parallel after Phase 1

---

## Parallel Example: Phase 1 (Foundational)

```bash
# Launch all new file creations in parallel:
Task: "T001 - Create CalloutDescriptionDisplayMode enum"
Task: "T002 - Create ISpaceSettingsLayout interface"
Task: "T003 - Create CreateSpaceSettingsLayoutInput DTO"
Task: "T004 - Create UpdateSpaceSettingsLayoutInput DTO"

# Then modify existing files (after new files exist):
Task: "T005 - Add layout to ISpaceSettings"
Task: "T006 - Add layout to CreateSpaceSettingsInput"  # parallel with T007
Task: "T007 - Add layout to UpdateSpaceSettingsEntityInput"  # parallel with T006
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Foundational types
2. Complete Phase 2: US1 — mutation + query working
3. **STOP and VALIDATE**: Test via GraphQL Playground
4. Deploy/demo if ready

### Incremental Delivery

1. Phase 1 → Types defined
2. Phase 2 (US1) → Core CRUD working → Validate
3. Phase 3 (US2) → New spaces default correctly → Validate
4. Phase 4 (US3) → Migration backfills existing spaces → Validate
5. Phase 5 (US4) → Confirm independence (no code needed) → Validate
6. Phase 6 → Schema + lint + build + tests pass

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- US4 requires no additional code — independence is architectural (per-space JSONB column)
- No test tasks generated (not explicitly requested in spec; risk-based per Constitution Principle 6)
- Commit after each phase completion
- Stop at any checkpoint to validate story independently
