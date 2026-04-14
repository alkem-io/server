# Tasks: Matrix Space Lifecycle Management

**Input**: Design documents from `/specs/082-matrix-space-lifecycle/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Not explicitly requested — test tasks omitted.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup

**Purpose**: Update dependencies and prepare adapter infrastructure

- [x] T001 Verify `@alkemio/matrix-adapter-lib` updated to `0.0.0-develop` @ 4fc8544 in `package.json` — confirm `JoinRule`, `JoinRulePublic`, `JoinRuleInvite`, `JoinRuleRestricted` are importable. Verify `uuid` v13 is installed (`pnpm add uuid`) — confirm `v5` is importable from `uuid` for deterministic category context IDs

---

## Phase 2: Foundational — Adapter Extensions

**Purpose**: Extend `CommunicationAdapter` method signatures to pass `avatarUrl`, `joinRule`, and migrate `isPublic` → `joinRule`. MUST complete before any user story.

**CRITICAL**: No user story work can begin until this phase is complete.

- [x] T002 Extend `CommunicationAdapter.createSpace()` to accept `avatarUrl?: string` and `joinRule?: JoinRule` parameters, pass as `avatar_url` and `join_rule` in payload in `src/services/adapters/communication-adapter/communication.adapter.ts`
- [x] T003 Extend `CommunicationAdapter.updateSpace()` to accept `avatarUrl?: string` and `joinRule?: JoinRule` parameters, pass as `avatar_url` and `join_rule` in payload in `src/services/adapters/communication-adapter/communication.adapter.ts`
- [x] T004 Migrate `CommunicationAdapter.updateRoom()`: replace `isPublic?: boolean` parameter with `joinRule?: JoinRule`, change payload from `is_public: isPublic` to `join_rule: joinRule` in `src/services/adapters/communication-adapter/communication.adapter.ts`
- [x] T005 Update all callers of `updateRoom()` that reference `isPublic`: migrate `src/domain/communication/room/room.service.ts` (line 122 comment) and `src/platform-admin/domain/communication/admin.communication.service.ts` (line 146, passes actual `isPublic` value — change to `joinRule`)
- [x] T006 Extend `CommunicationAdapter.createRoom()` to accept `joinRule?: JoinRule` parameter, pass as `join_rule` in payload in `src/services/adapters/communication-adapter/communication.adapter.ts`
- [x] T007 Update existing unit tests for adapter methods in `src/services/adapters/communication-adapter/communication.adapter.spec.ts` — fix tests broken by `isPublic` → `joinRule` migration, add tests for new `avatarUrl`/`joinRule` parameters on `createSpace`, `updateSpace`, `createRoom`

**Checkpoint**: Adapter is fully extended. All existing tests pass. User story implementation can now begin.

---

## Phase 3: User Story 1 — Space Creation Mirrors to Matrix (Priority: P1) MVP

**Goal**: When an Alkemio space/subspace is created, a corresponding Matrix space is automatically created and anchored to the correct parent.

**Independent Test**: Create a top-level space → verify Matrix space created. Create a subspace → verify created and anchored under parent.

### Implementation for User Story 1

- [x] T008 [US1] In `SpaceService.createSpace()` in `src/domain/space/space/space.service.ts`, inject `CommunicationAdapter` and add call to `adapter.createSpace(space.id, displayName, parentSpace?.id, avatarUrl, JoinRuleInvite)` after space entity is saved but before recursive subspace creation. Note: Go adapter handles idempotent creation internally (FR-010) — no need for pre-check via `getSpace()`
- [x] T009 [US1] Resolve avatar URL for the space profile at creation time — extract avatar visual URI from `spaceAbout.profile.visuals` (type `AVATAR`) to pass to `createSpace()` in `src/domain/space/space/space.service.ts`
- [x] T010 [US1] Handle graceful degradation: wrap the `createSpace()` call in try/catch, log warning on failure without blocking space creation, in `src/domain/space/space/space.service.ts`

**Checkpoint**: Creating a space/subspace triggers Matrix space creation with correct parent anchoring.

---

## Phase 4: User Story 2 — Room Anchoring to Matrix Spaces (Priority: P1)

**Goal**: When any room is created under a space, it is automatically anchored to the corresponding Matrix space.

**Independent Test**: Create a room under a space that has a Matrix space → verify room is anchored as child.

### Implementation for User Story 2

- [x] T011 [US2] Populate `Communication.spaceID` properly: in `CommunityService.createCommunity()` in `src/domain/community/community/community.service.ts`, pass the actual `space.id` instead of empty string when creating the Communication entity
- [x] T012 [US2] Thread `spaceID` from Communication through to room creation: in `CommunicationService.createCommunication()` in `src/domain/communication/communication/communication.service.ts`, pass `spaceID` as `parentContextId` when calling `RoomService.createRoom()` for the updates room
- [x] T013 [US2] In `RoomService.createExternalCommunicationRoom()` in `src/domain/communication/room/room.service.ts`, pass `parentContextId` to `communicationAdapter.createRoom()` — currently this parameter is not forwarded
- [x] T014 [US2] Handle rooms created for callouts and posts: ensure `parentContextId` is threaded through in callout/post room creation paths in `src/domain/collaboration/` to anchor these rooms to the correct space's Matrix space

**Checkpoint**: All newly created rooms (updates, callout, post) are anchored to their owning space's Matrix space.

---

## Phase 5: User Story 7 — Forum Rooms Are Publicly Accessible (Priority: P1)

**Goal**: All rooms within the forum hierarchy are created with `JoinRulePublic` so any authenticated Synapse user can read/write without invitation.

**Independent Test**: Create a forum discussion room → verify it has `JoinRulePublic` join rule. Create a non-forum room → verify its visibility is NOT changed.

### Implementation for User Story 7

- [x] T015 [US7] In `DiscussionService.createDiscussion()` in `src/platform/forum-discussion/discussion.service.ts`, pass `JoinRulePublic` as `joinRule` when creating the discussion room (type `DISCUSSION_FORUM`) via `RoomService.createRoom()`
- [x] T016 [US7] Ensure non-forum room types (`UPDATES`, `CALLOUT`, `POST`, `CONVERSATION`, etc.) do NOT receive a `joinRule` override — verify no `joinRule` is passed for these types in their respective creation paths

**Checkpoint**: Forum discussion rooms are publicly accessible; other room types retain default visibility.

---

## Phase 6: User Story 3 — Forum Discussion Hierarchy in Matrix (Priority: P2)

**Goal**: Maintain a Matrix space hierarchy of forum (Matrix space) → category (Matrix space) → discussion room for forum discussions.

**Independent Test**: Create a forum discussion → verify Matrix hierarchy: Space > Forum (Matrix space) > Category (Matrix space) > Discussion Room.

### Implementation for User Story 3

- [x] T017 [US3] Create a helper method (e.g., `ensureForumMatrixHierarchy()`) in `ForumService` or a new service in `src/platform/forum/` that: (a) checks if forum Matrix space exists via `adapter.getSpace(forum.id)`, (b) creates it if missing via `adapter.createSpace(forum.id, forumName, spaceId, undefined, JoinRulePublic)`, (c) checks/creates category Matrix space via `adapter.createSpace(categoryContextId, categoryName, forum.id, undefined, JoinRulePublic)` using deterministic UUID v5 context ID: `v5('${forum.id}:category:${categoryName}', FORUM_CATEGORY_NAMESPACE)` where `FORUM_CATEGORY_NAMESPACE` is a fixed UUID constant defined in a shared constants file
- [x] T018 [US3] In `ForumService.createDiscussion()` in `src/platform/forum/forum.service.ts`, call the forum hierarchy helper before creating the discussion room, passing the space ID (needs to be threaded through — obtain from forum's parent space)
- [x] T019 [US3] After discussion room is created, anchor it to the category Matrix space via `adapter.setParent(room.id, false, categoryContextId)` in `src/platform/forum/forum.service.ts` or `src/platform/forum-discussion/discussion.service.ts`
- [x] T020 [US3] Thread the owning `spaceId` to `ForumService` — the forum needs to know which space it belongs to in order to pass it as `parentContextId` for the forum Matrix space. Determine the threading path (via Community → Communication → spaceID, or direct parameter)

- [x] T039 [US3] Handle forum discussion deletion: in `DiscussionService.removeDiscussion()` in `src/platform/forum-discussion/discussion.service.ts`, after deleting the discussion room, check if the category Matrix space has remaining discussions — if empty, delete the category Matrix space via `adapter.deleteSpace(categoryContextId)` (derive categoryContextId using same UUID v5 logic). Similarly check if forum Matrix space has remaining categories.

**Checkpoint**: Forum discussions are organized in a three-level Matrix hierarchy with correct anchoring, and cleanup on deletion prevents orphaned Matrix spaces.

---

## Phase 7: User Story 4 — Space Display Name and Avatar Sync to Matrix (Priority: P2)

**Goal**: When a space's display name or avatar changes, the corresponding Matrix space is updated.

**Independent Test**: Update a space's display name → verify Matrix space name updated. Change avatar → verify Matrix space avatar updated.

### Implementation for User Story 4

- [x] T021 [P] [US4] In `SpaceAboutService.updateSpaceAbout()` in `src/domain/space/space.about/space.about.service.ts`, after profile update, call `adapter.updateSpace(spaceId, newDisplayName)` — thread the `spaceId` through (SpaceAbout doesn't currently have direct access to `space.id`)
- [x] T022 [P] [US4] In visual upload/update handlers for space profiles, detect when a space's avatar visual changes and call `adapter.updateSpace(spaceId, undefined, undefined, newAvatarUrl)` — identify the correct hook point in `src/domain/common/profile/` or `src/domain/common/visual/`
- [x] T023 [US4] Handle avatar removal: when avatar is cleared (empty string or null), call `adapter.updateSpace(spaceId, undefined, undefined, '')` to remove the Matrix space avatar
- [x] T024 [US4] Wrap all Matrix update calls in graceful error handling — log warning on failure, don't block the Alkemio update

**Checkpoint**: Space display name and avatar changes are reflected in Matrix.

---

## Phase 8: User Story 5 — Space Deletion Cascades to Matrix (Priority: P2)

**Goal**: When a space is deleted, the corresponding Matrix space (and all children) is also deleted.

**Independent Test**: Delete a space with a Matrix space → verify Matrix space removed.

### Implementation for User Story 5

- [x] T025 [US5] In `SpaceService.deleteSpaceOrFail()` in `src/domain/space/space/space.service.ts`, add call to `adapter.deleteSpace(space.id)` BEFORE the cascade deletion of child entities. Adapter uses `onError: 'boolean'` so this won't block if Matrix space doesn't exist
- [x] T026 [US5] Verify deletion order: Matrix space deletion must happen before Communication/Room entities are deleted from DB, since the adapter needs the context ID to be valid

**Checkpoint**: Deleting a space removes its Matrix space. Adapter failures don't block deletion.

---

## Phase 9: User Story 8 — Admin Sync Mutation for Existing Spaces (Priority: P2)

**Goal**: Provide an idempotent admin GQL mutation to synchronize existing spaces into the Matrix hierarchy.

**Independent Test**: Run sync mutation on existing spaces → verify Matrix spaces created. Run again → verify no duplicates.

### Implementation for User Story 8

- [x] T027 [US8] Create `AdminCommunicationSpaceSyncService` in `src/platform-admin/domain/communication/` with method `syncSpaceHierarchy()` that: (a) loads all spaces ordered by level (L0 → L1 → L2), (b) for each space checks existence via `adapter.getSpace(space.id)`, (c) creates missing Matrix spaces with correct parent and `JoinRuleInvite`, (d) logs progress and failures per space
- [x] T028 [US8] In the sync service, for each space: load its Communication entity and anchor the updates room to the space's Matrix space via `adapter.setParent(room.id, false, space.id)`
- [x] T029 [US8] In the sync service, handle forum hierarchies: for each space with a forum, create forum/category Matrix spaces (with `JoinRulePublic`) and anchor discussion rooms with `JoinRulePublic` visibility
- [x] T030 [US8] Add `adminCommunicationSyncSpaceHierarchy` mutation to the admin communication resolver in `src/platform-admin/domain/communication/admin.communication.resolver.mutations.ts` (or appropriate resolver file), with platform admin authorization
- [x] T031 [US8] Regenerate GraphQL schema: run `pnpm run schema:print && pnpm run schema:sort` and verify the new mutation appears in `schema.graphql`

**Checkpoint**: Admin can trigger full Matrix space hierarchy sync. Running multiple times is safe.

---

## Phase 10: User Story 6 — Space Relocation Updates Matrix Hierarchy (Priority: P3)

**Goal**: When a space is relocated to a different parent, the Matrix space is re-anchored.

**Independent Test**: Move a subspace from Parent A to Parent B → verify Matrix space re-anchored.

### Implementation for User Story 6

- [x] T032 [US6] Identify the space relocation code path — find where `subspace.parentSpace` is reassigned (likely in `SpaceService.addSubspaceToSpace()` or a relocation-specific method) in `src/domain/space/space/space.service.ts`
- [x] T033 [US6] After reparenting, call `adapter.setParent(subspace.id, true, newParent.id)` to re-anchor the Matrix space under the new parent in `src/domain/space/space/space.service.ts`
- [x] T034 [US6] Handle edge case: if subspace is promoted to top-level (no parent), the Matrix space should be detached — determine if `setParent` supports detaching or if a different approach is needed

**Checkpoint**: Space relocation correctly updates the Matrix hierarchy.

---

## Phase 11: Synapse Infrastructure — Room Visibility & Configuration

**Purpose**: Extend the Synapse module and configuration to support room visibility filtering and adapter requirements

### Implementation for User Story 9 (Non-Forum Rooms Hidden from Element)

- [x] T040 [US9] Extend `AlkemioRoomControl` module in `.build/synapse/modules/alkemio_room_control.py` with `_patch_sync_handler()` method that monkey-patches `SyncHandler.get_sync_result_builder` to filter rooms with `io.alkemio.visibility` state event `{"visible": false}` from `/sync` responses for non-bot users
- [x] T041 [US9] Add `ALKEMIO_VISIBILITY_EVENT = "io.alkemio.visibility"` constant and import `Set` type in `.build/synapse/modules/alkemio_room_control.py`
- [x] T042 [US9] Ensure AppService bot exemption in sync filter — bot user (`@{appservice_sender}:{homeserver_domain}`) bypasses all visibility filtering

### Implementation for User Story 10 (Synapse Infrastructure)

- [x] T043 [US10] Add `room_list_publication_rules` to `.build/synapse/homeserver.yaml` — allow only AppService bot user to publish rooms, deny all others
- [x] T044 [US10] Enable `registration_shared_secret` in `.build/synapse/homeserver.yaml` for adapter user registration via Synapse admin API
- [x] T045 [US10] Rename `SYNAPSE_SHARED_SECRET` → `SYNAPSE_SERVER_SHARED_SECRET` in `.env.docker` for consistency with Synapse config key
- [x] T046 [US10] Update `quickstart-services.yml`: bump matrix-adapter-go image from `v0.8.6` → `latest`, add `SYNAPSE_SERVER_SHARED_SECRET` to adapter service environment
- [x] T047 [US10] Add `alkemio_room_control` logger at DEBUG level in `.build/synapse/alkemio.matrix.host.log.config` for development observability

**Checkpoint**: Synapse module filters non-forum rooms from Element clients. Room directory is controlled. Adapter has shared secret access.

---

## Phase 12: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [x] T035 Run `pnpm lint` and fix any linting errors across all modified files
- [x] T036 Run `pnpm test:ci:no:coverage` and fix any broken tests
- [x] T037 Run `pnpm run schema:diff` to verify schema changes are non-breaking (only additive mutation)
- [x] T038 Review all Matrix adapter calls for consistent error handling — ensure graceful degradation pattern (log warning, don't block) is applied uniformly
- [x] T048 Verify Synapse module initializes with sync filtering enabled in development stack

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 — BLOCKS all user stories
- **Phase 3-10 (User Stories)**: All depend on Phase 2 completion
- **Phase 11 (Synapse Infrastructure)**: Independent of server-side phases — can be done in parallel with Phases 3-10
- **Phase 12 (Polish)**: Depends on all desired user stories and infrastructure being complete

### User Story Dependencies

- **US1 (Space Creation, P1)**: Can start after Phase 2 — no dependencies on other stories
- **US2 (Room Anchoring, P1)**: Can start after Phase 2 — independent of US1 (spaces may or may not have Matrix spaces)
- **US7 (Forum Room Visibility, P1)**: Can start after Phase 2 — independent, only affects room creation params
- **US3 (Forum Hierarchy, P2)**: Depends on US2 (room anchoring mechanism) and US7 (public visibility) — uses same threading infrastructure
- **US4 (Name/Avatar Sync, P2)**: Can start after Phase 2 — independent of other stories
- **US5 (Deletion, P2)**: Can start after Phase 2 — independent of other stories
- **US8 (Admin Sync, P2)**: Depends on US1 + US2 + US3 + US7 — reuses all creation/anchoring logic
- **US6 (Relocation, P3)**: Can start after Phase 2 — independent of other stories
- **US9 (Room Visibility Filtering, P1)**: Independent of server-side work — Synapse module only
- **US10 (Synapse Infrastructure, P1)**: Independent — infra/config changes only

### Parallel Opportunities

- **After Phase 2**: US1, US2, US7, US4, US5, US6 can all start in parallel (different files)
- **Within Phase 2**: T002, T003, T004, T006 modify the same file (`communication.adapter.ts`) — must be sequential
- **US3** should start after US2 and US7 are done (uses their infrastructure)
- **US8** should be last user story (composes all other capabilities)

---

## Parallel Example: After Phase 2

```bash
# These user stories can be worked on simultaneously:
# Stream A: US1 — Space Creation (T008-T010 in space.service.ts)
# Stream B: US2 — Room Anchoring (T011-T014 in communication/community services)
# Stream C: US7 — Forum Visibility (T015-T016 in discussion.service.ts)
# Stream D: US4 — Name/Avatar Sync (T021-T024 in space.about.service.ts + visual handlers)
# Stream E: US5 — Deletion (T025-T026 in space.service.ts — same file as US1, coordinate)
```

---

## Implementation Strategy

### MVP First (US1 + US2 + US7)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational adapter extensions
3. Complete Phase 3: US1 — Space creation mirrors to Matrix
4. Complete Phase 4: US2 — Room anchoring
5. Complete Phase 5: US7 — Forum room visibility
6. **STOP and VALIDATE**: Spaces create Matrix spaces, rooms anchor, forum rooms are public
7. Deploy/demo if ready

### Incremental Delivery

1. Setup + Foundational → Adapter ready
2. US1 + US2 + US7 → Core hierarchy works (MVP!)
3. US3 → Forum hierarchy complete
4. US4 → Name/avatar sync
5. US5 → Deletion cleanup
6. US8 → Admin backfill tool
7. US6 → Relocation support
8. Each increment adds value without breaking previous stories

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- All Matrix adapter calls must follow graceful degradation pattern: log warning, don't block Alkemio operations
- `JoinRuleInvite` for Alkemio space containers; `JoinRulePublic` for forum/category spaces and discussion rooms
- Forum category context IDs use deterministic UUID v5: `v5('${forum.id}:category:${categoryName}', FORUM_CATEGORY_NAMESPACE)` via `uuid` package
- No database migrations needed — Go adapter manages Matrix ID mapping internally
- Synapse module changes (`.build/synapse/`) are Python, not TypeScript — tested via development stack
- Commit after each task or logical group
