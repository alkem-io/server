# Tasks: Media Gallery Contribution Tracking

**Input**: Design documents from `/specs/039-media-gallery-contributions/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md

**Tests**: Unit test included (plan.md specifies "Vitest 4.x -- unit test for new reporter method").

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)
- Include exact file paths in descriptions

---

## Phase 1: Foundational (Blocking Prerequisite)

**Purpose**: Register the new contribution type constant required by all downstream tasks

- [x] T001 Add `MEDIA_GALLERY_CONTRIBUTION` constant to `CONTRIBUTION_TYPE` in `src/services/external/elasticsearch/types/contribution.type.ts`

**Checkpoint**: New type constant available for reporter and resolver tasks

---

## Phase 2: User Story 1 - Track Media Gallery Uploads on Dashboard (Priority: P1) MVP

**Goal**: Report `MEDIA_GALLERY_CONTRIBUTION` events to Elasticsearch when a user uploads a visual to a media gallery within a callout

**Independent Test**: Upload a visual to a media gallery via the `addVisualToMediaGallery` mutation and confirm the event appears in the Elasticsearch contribution index with the correct type, author, media gallery ID, display name, space, and timestamp

### Implementation for User Story 1

- [x] T002 [P] [US1] Add `mediaGalleryContribution(contribution, details)` method to `ContributionReporterService` in `src/services/external/elasticsearch/contribution-reporter/contribution.reporter.service.ts` following the `whiteboardContribution()` / `memoContribution()` pattern
- [x] T003 [P] [US1] Add `getLevelZeroSpaceIdForMediaGallery(mediaGalleryID)` method to `CommunityResolverService` in `src/services/infrastructure/entity-resolver/community.resolver.service.ts` traversing Space -> Collaboration -> CalloutsSet -> Callout -> CalloutFraming -> MediaGallery
- [x] T004 [US1] Import `ContributionReporterModule` and `EntityResolverModule` in `MediaGalleryModule` in `src/domain/common/media-gallery/media.gallery.module.ts`
- [x] T005 [US1] Inject `ContributionReporterService`, `CommunityResolverService`, and `EntityManager` in `MediaGalleryResolverMutations` and wire contribution reporting after successful visual creation in `addVisualToMediaGallery()` in `src/domain/common/media-gallery/media.gallery.resolver.mutations.ts` — resolve display name by querying `CalloutFraming` where `mediaGallery.id` matches, loading `profile` relation, and formatting as `"Media Gallery of " + calloutFraming.profile.displayName`; use media gallery UUID as the contribution `id`
- [x] T006 [US1] Add unit test for `mediaGalleryContribution()` method in `src/services/external/elasticsearch/contribution-reporter/contribution.reporter.service.spec.ts` following existing reporter test patterns

**Checkpoint**: Visual uploads to media galleries generate contribution events in Elasticsearch. User Story 1 is fully functional and independently testable.

---

## Phase 3: User Story 2 - View Media Gallery Activity in Kibana (Priority: P2)

**Goal**: Confirm media gallery contributions appear alongside existing contribution types in the Kibana dashboard

**Independent Test**: Check the Kibana dashboard and confirm `MEDIA_GALLERY_CONTRIBUTION` appears as a filterable contribution type alongside existing types (WHITEBOARD_CONTRIBUTION, MEMO_CONTRIBUTION, etc.)

**Note**: No server-side code changes required for this story. The Kibana dashboard dynamically picks up new contribution types from the Elasticsearch index. This phase is verification-only and depends on User Story 1 being complete and events flowing into the index.

**Checkpoint**: Media gallery contributions are visible and filterable on the Kibana dashboard alongside all other contribution types.

---

## Phase 4: Polish & Cross-Cutting Concerns

**Purpose**: Verify build integrity, lint compliance, and test suite health

- [x] T007 [P] Run build verification (`pnpm build`) and confirm no compilation errors
- [x] T008 [P] Run lint verification (`pnpm lint`) and confirm no lint violations
- [x] T009 Run test suite (`pnpm test:ci:no:coverage`) and confirm all tests pass including new unit test
- [ ] T010 Run quickstart.md validation steps from `specs/039-media-gallery-contributions/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Foundational (Phase 1)**: No dependencies - start immediately
- **User Story 1 (Phase 2)**: Depends on Phase 1 (T001 must complete before T002-T006)
- **User Story 2 (Phase 3)**: Depends on Phase 2 (verification-only, no code changes)
- **Polish (Phase 4)**: Depends on Phase 2 completion

### Task Dependencies within User Story 1

- **T002** (reporter method): Depends on T001 (type constant). Different file from T003 -> parallelizable with T003
- **T003** (space resolution): Depends on T001 (only conceptually). Different file from T002 -> parallelizable with T002
- **T004** (module imports): Can run in parallel with T002/T003 but logically precedes T005
- **T005** (resolver wiring): Depends on T002, T003, T004 (needs reporter, resolver, and module imports in place)
- **T006** (unit test): Depends on T002 (tests the reporter method)

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 1) - no dependencies on other stories
- **User Story 2 (P2)**: Depends on User Story 1 being complete and events flowing into Elasticsearch - verification only, no code

### Parallel Opportunities

- T002 and T003 can run in parallel (different files, no shared dependencies)
- T007 and T008 can run in parallel (independent verification commands)

---

## Parallel Example: User Story 1

```bash
# After T001 completes, launch these in parallel:
Task T002: "Add mediaGalleryContribution() method in contribution.reporter.service.ts"
Task T003: "Add getLevelZeroSpaceIdForMediaGallery() method in community.resolver.service.ts"

# Then sequentially:
Task T004: "Import modules in media.gallery.module.ts"
Task T005: "Wire contribution reporting in media.gallery.resolver.mutations.ts"
Task T006: "Unit test for mediaGalleryContribution()"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Register type constant (T001)
2. Complete Phase 2: All US1 tasks (T002-T006)
3. **STOP and VALIDATE**: Upload a visual, check Elasticsearch index
4. Deploy/demo if ready

### Incremental Delivery

1. T001 -> Type constant registered
2. T002 + T003 (parallel) -> Reporter method + space resolution ready
3. T004 + T005 -> Wiring complete, contribution events flow
4. T006 -> Unit test confirms reporter behavior
5. Phase 4 -> Full verification pass
