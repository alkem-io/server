# Tasks: Cross-Space Moves

**Input**: Design documents from `/specs/083-cross-space-moves/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md
**Dependency**: `084-move-room-handling` must be merged into the working branch

**Tests**: Included — constitution requires risk-based testing for domain invariants and observable behaviors.

**Organization**: Tasks grouped by user story. US1 and US2 are backend (server repo). US3 is frontend (client-web repo, documented for reference). US4 is backend + frontend.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: DTOs, module wiring, and shared dependency injection for both mutations

- [x] T001 [P] Create `MoveSpaceL1ToSpaceL0Input` DTO in `src/services/api/conversion/dto/move.dto.space.l1.to.space.l0.input.ts` — two UUID fields (`spaceL1ID`, `targetSpaceL0ID`) with `@InputType()` and `@Field(() => UUID)` decorators, following `ConvertSpaceL1ToSpaceL2Input` pattern
- [x] T002 [P] Create `MoveSpaceL1ToSpaceL2Input` DTO in `src/services/api/conversion/dto/move.dto.space.l1.to.space.l2.input.ts` — two UUID fields (`spaceL1ID`, `targetSpaceL1ID`) with `@InputType()` and `@Field(() => UUID)` decorators
- [x] T003 Update `src/services/api/conversion/conversion.module.ts` — add imports for `SpaceMoveRoomsModule` (from `@domain/communication/space-move-rooms/space.move.rooms.module`), `NamingModule` (if not present), `CalloutsSetModule`, `ClassificationModule`, `NotificationAdapterModule`, and `EntityResolverModule`. Remove `InvitationModule` (replaced by `RoleSetService.createInvitationExistingActor()` path). Inject `SpaceMoveRoomsService`, `NamingService`, `CalloutsSetService`, `ClassificationService`, `UrlGeneratorCacheService`, `SpaceLookupService`, `NotificationUserAdapter`, `CommunityResolverService`, `RoleSetAuthorizationService`, and `AuthorizationPolicyService` into `ConversionService` constructor

---

## Phase 2: Foundational (Shared Cross-L0 Helpers)

**Purpose**: Reusable validation and sync methods used by BOTH move mutations. These extend `ConversionService` in `src/services/api/conversion/conversion.service.ts`.

**CRITICAL**: No user story work can begin until this phase is complete.

- [x] T004 [P] Add private method `validateNameIDsInTargetL0Scope(movedSpaceId: string, targetL0Id: string): Promise<void>` to `src/services/api/conversion/conversion.service.ts` — loads moved subtree nameIDs (source L1 + its L2 children via `spaceRepository.find`), calls `namingService.getReservedNameIDsInLevelZeroSpace(targetL0Id)`, throws `ValidationException('NameID collision in target L0 scope', LogContext.CONVERSION, { conflictingNameID })` on collision. Per FR-008: only space nameIDs, not callout/post/profile nameIDs
- [x] T005 [P] Add private method `syncInnovationFlowTagsetsForSubtree(movedSpaceId: string, targetL0Id: string): Promise<void>` to `src/services/api/conversion/conversion.service.ts` — syncs the entire moved subtree (FR-018):
  1. Resolve all descendant space IDs via `spaceLookupService.getAllDescendantSpaceIDs(movedSpaceId)`, prepend `movedSpaceId`
  2. For each space ID in the subtree: load space's collaboration → calloutsSet → callouts with `{ classification: true }` relation. Get that space's OWN calloutsSet tagset templates via `calloutsSetService.getTagsetTemplatesSet(calloutsSet.id)` — NOT the target L0's templates, because L1/L2 spaces retain their own innovation flow after a cross-L0 move
  3. For each callout: call `classificationService.updateTagsetTemplateOnSelectTagset(callout.classification.id, tagsetTemplate)` for each template
  4. **Bug fix (2026-04-02)**: `updateTagsetTemplateOnSelectTagset()` was unconditionally resetting tags to `defaultSelectedValue`. Fixed in `src/domain/common/classification/classification.service.ts` to check `tagsetTemplate.allowedValues` first — valid current values are preserved, only invalid values fall back to default
- [x] T005b [P] **Bug fix**: Update `ClassificationService.updateTagsetTemplateOnSelectTagset()` in `src/domain/common/classification/classification.service.ts` — when an existing tagset is found, check if the current tag value is present in `tagsetTemplate.allowedValues` before resetting. If valid, preserve it; if invalid or missing, fall back to `defaultSelectedValue`. This fixes flow state reset during both cross-L0 moves and individual callout transfers
- [x] T006 [P] Add private method `collectRemovedActorIds(spaceCommunityRoles: SpaceCommunityRoles, includeAdmins: boolean): string[]` to `src/services/api/conversion/conversion.service.ts` — collects all actor IDs (users, orgs, VCs) from the roles object. For cross-L0 moves, `includeAdmins=true` for BOTH mutations because crossing the L0 boundary invalidates the entire community hierarchy. Returns flat array of UUIDs for passing to `SpaceMoveRoomsService.handleRoomsDuringMove()`
- [x] T007 [P] Add private method `invalidateUrlCachesForSubtree(movedSpaceId: string): Promise<void>` to `src/services/api/conversion/conversion.service.ts` — loads all spaces in the moved subtree with `about.profile` relation, calls `urlGeneratorCacheService.revokeUrlCache(space.about.profile.id)` for each. Follow the pattern in `SpaceService.updateSpacePlatformSettings()` at `src/domain/space/space/space.service.ts` (nameID change handler, ~line 822). Only space profile caches need explicit revocation — non-space entity caches (callouts, posts, contributions) self-heal via the 1-second cache TTL

**Checkpoint**: Foundation ready — shared helpers tested via unit tests in Phase 3/4. User story implementation can now begin.

---

## Phase 3: User Story 1 — Move Subspace to a Different Space (Priority: P1) MVP

**Goal**: Platform admin can move an L1 subspace from one L0 space to another L0 space. The subspace stays at level 1, all content moves with it, ALL community memberships are cleared.

**Independent Test**: Create two L0 spaces. Add an L1 subspace with callouts and an L2 sub-subspace to the first. Move the L1 to the second L0. Verify all content appears under the new L0, community is cleared, authorization reflects the new parent, and the old L0 no longer contains the moved subspace.

### Implementation for User Story 1

- [x] T008 [US1] Implement `moveSpaceL1ToSpaceL0OrFail(moveData: MoveSpaceL1ToSpaceL0Input): Promise<{ space: ISpace; removedActorIds: string[] }>` in `src/services/api/conversion/conversion.service.ts` — follow the sequence from `contracts/move-space-l1-to-l0.md`:
  1. Load source L1 with relations: `{ community: { roleSet: true }, storageAggregator: true, subspaces: true }`
  2. Load target L0 with relations: `{ storageAggregator: true, community: { roleSet: true } }`
  3. Validate: source is L1 (`space.level === SpaceLevel.L1`), target is L0 (`target.level === SpaceLevel.L0`), different L0s (`sourceL1.levelZeroSpaceID !== targetL0.id`). Throw `ValidationException` per data-model.md validation rules
  4. Call `validateNameIDsInTargetL0Scope(sourceL1.id, targetL0.id)` (T004)
  5. Call `getSpaceCommunityRoles(roleSetL1)` → collect all actor IDs via `collectRemovedActorIds(roles, true)` (T006) — store as `removedActorIds` for return
  6. Call `removeContributors(roleSetL1, roles)` to clear members + leads + orgs + VCs
  7. Explicitly remove ALL user admins: `removeActorFromRole(roleSetL1, RoleName.ADMIN, adminId, false)` for each. Descendant communities are cascade-cleared automatically via `revokeSpaceTreeCredentials()` when removing L1 MEMBER roles
  8. Update structural fields: `sourceL1.parentSpace = targetL0`, `sourceL1.levelZeroSpaceID = targetL0.id`
  9. Bulk update descendant levelZeroSpaceIDs via QueryBuilder: `spaceRepository.createQueryBuilder().update(Space).set({ levelZeroSpaceID: targetL0.id }).whereInIds([...descendantIds]).execute()`. Follow the existing conversion service pattern — no explicit `queryRunner.startTransaction()`
  10. Update storage: `sourceL1.storageAggregator.parentStorageAggregator = targetL0.storageAggregator`
  11. Update roleSet: `roleSetService.setParentRoleSetAndCredentials(roleSetL1, roleSetL0)`
  12. Call `syncInnovationFlowTagsetsForSubtree(sourceL1.id, targetL0.id)` (T005)
  13. Update sortOrder: shift existing children of target L0 up by 1 (`spaceRepository.createQueryBuilder().update(Space).set({ sortOrder: () => '"sortOrder" + 1' }).where('"parentSpaceId" = :parentId', { parentId: targetL0.id }).execute()`), then set `sourceL1.sortOrder = 0` (first position — admin can rearrange afterwards)
  14. Save space: `spaceService.save(sourceL1)` — Account association is inherited via the updated `levelZeroSpaceID` → target L0 → Account path. After save, propagate license entitlements via `accountHostService.assignLicensePlansToSpace(sourceL1.id, account.accountType)`. Quota overflow does not block the move
  15. Return `{ space: sourceL1, removedActorIds }`

- [x] T009 [US1] Implement `moveSpaceL1ToSpaceL0` resolver mutation in `src/services/api/conversion/conversion.resolver.mutations.ts` — follow the pattern of existing `convertSpaceL2ToSpaceL1` resolver:
  1. `@Mutation(() => ISpace, { description: 'Move an L1 subspace to a different L0 space. All content moves; all community memberships are cleared. Requires platform admin.' })`
  2. Authorization: check `AuthorizationPrivilege.PLATFORM_ADMIN` against global policy (same pattern as `convertSpaceL1ToSpaceL0`)
  3. Call `conversionService.moveSpaceL1ToSpaceL0OrFail(moveData)` → destructure `{ space, removedActorIds }`
  4. Save space via `spaceService.save(space)`
  5. Get parent auth: `getParentSpaceAuthorization(space.id)` → target L0's auth
  6. Apply auth: `spaceAuthorizationService.applyAuthorizationPolicy(space.id, parentAuth)` — this internally recalculates `platformRolesAccess` for the moved space and its subtree
  7. Save all auth policies: `authorizationPolicyService.saveAll(policies)`
  8. Invalidate caches: `invalidateUrlCachesForSubtree(space.id)` (T007)
  9. Fire-and-forget rooms: `void this.spaceMoveRoomsService.handleRoomsDuringMove(space.id, removedActorIds)`
  10. Return freshly loaded space

- [x] T010 [US1] Add unit tests in `src/services/api/conversion/conversion.service.move.spec.ts` for `moveSpaceL1ToSpaceL0OrFail`:
  - Rejects when source is not L1 (L0 or L2 → ValidationException)
  - Rejects self-move (source already under target L0 → ValidationException)
  - Rejects nameID collision in target L0 scope
  - Clears ALL community roles including admins (verify `removeActorFromRole` called for each admin)
  - Updates `levelZeroSpaceID` for moved space AND descendants (verify bulk QueryBuilder call)
  - Updates `storageAggregator.parentStorageAggregator` to target L0's
  - Calls `setParentRoleSetAndCredentials` with target L0's roleSet
  - Sets `sortOrder` to 0 (first position) and shifts existing children up by 1
  - Calls `syncInnovationFlowTagsetsForSubtree` for the moved subtree

**Checkpoint**: US1 fully functional — L1→L1 cross-L0 move works end-to-end. Test via GraphQL playground per quickstart.md manual testing steps.

---

## Phase 4: User Story 2 — Move Subspace to Be a Sub-subspace in Another Space (Priority: P2)

**Goal**: Platform admin can move an L1 subspace to become an L2 under a target L1 in a different L0. The space is demoted, ALL community roles cleared (crossing L0 boundary invalidates the entire community hierarchy).

**Independent Test**: Create two L0 spaces, each with an L1 subspace. Move the L1 from the first L0 to become an L2 under the L1 in the second L0. Verify the space is now L2, content is preserved, ALL community roles cleared including admins, and levelZeroSpaceID reflects the new L0.

### Implementation for User Story 2

- [x] T011 [US2] Implement `moveSpaceL1ToSpaceL2OrFail(moveData: MoveSpaceL1ToSpaceL2Input): Promise<{ space: ISpace; removedActorIds: string[] }>` in `src/services/api/conversion/conversion.service.ts` — follow the sequence from `contracts/move-space-l1-to-l2.md`:
  1. Load source L1 with relations: `{ community: { roleSet: true }, storageAggregator: true, subspaces: true }`
  2. Load target L1 with relations: `{ storageAggregator: true, community: { roleSet: true } }`
  3. Load target L0 via `spaceService.getSpaceOrFail(targetL1.levelZeroSpaceID)`
  4. Validate: source is L1, target is L1, different L0s (`sourceL1.levelZeroSpaceID !== targetL1.levelZeroSpaceID`)
  5. Validate depth: source L1 has NO L2 children (`sourceL1.subspaces.length === 0`). Throw `ValidationException('Cannot demote: source L1 has L2 children that would exceed max nesting depth', LogContext.CONVERSION)`
  6. Call `validateNameIDsInTargetL0Scope(sourceL1.id, targetL0.id)` — only source nameID (no descendants since blocked by step 5)
  7. Call `getSpaceCommunityRoles(roleSetL1)` → collect ALL actor IDs via `collectRemovedActorIds(roles, true)` — store as `removedActorIds`
  8. Call `removeContributors(roleSetL1, roles)` to clear members + leads + orgs + VCs, then explicitly remove ALL user admins. Same pattern as T008 step 7
  9. Update structural fields: `sourceL1.level = SpaceLevel.L2`, `sourceL1.parentSpace = targetL1`, `sourceL1.levelZeroSpaceID = targetL0.id`
  10. Update storage: `sourceL1.storageAggregator.parentStorageAggregator = targetL1.storageAggregator`
  11. Update roleSet: `roleSetService.setParentRoleSetAndCredentials(roleSetL1, roleSetTargetL1)`
  12. Call `syncInnovationFlowTagsetsForSubtree(sourceL1.id, targetL0.id)` (T005) — no descendants to sync (blocked by step 5), but using subtree method for consistency
  13. Update sortOrder: shift existing children of target L1 up by 1, then set `sourceL1.sortOrder = 0` (first position). Same pattern as T008 step 13
  14. Save space: `spaceService.save(sourceL1)` — Account association inherited via updated `levelZeroSpaceID`. Propagate license entitlements. Quota overflow does not block
  15. Return `{ space: sourceL1, removedActorIds }`

- [x] T012 [US2] Implement `moveSpaceL1ToSpaceL2` resolver mutation in `src/services/api/conversion/conversion.resolver.mutations.ts` — same pattern as T009 but:
  1. `@Mutation(() => ISpace, { description: 'Move an L1 subspace to become an L2 under a target L1 in a different L0. All community roles cleared. Requires platform admin.' })`
  2. Authorization: PLATFORM_ADMIN
  3. Call `conversionService.moveSpaceL1ToSpaceL2OrFail(moveData)` → destructure `{ space, removedActorIds }`
  4. Save space, get parent auth from target L1 via `getParentSpaceAuthorization(space.id)`, apply auth via `applyAuthorizationPolicy(space.id, parentAuth)`
  5. Save all auth policies
  6. Invalidate URL cache (single space, no descendants since depth blocked)
  7. Fire-and-forget rooms: `void this.spaceMoveRoomsService.handleRoomsDuringMove(space.id, removedActorIds)`
  8. Return space

- [x] T013 [US2] Add unit tests in `src/services/api/conversion/conversion.service.move.spec.ts` for `moveSpaceL1ToSpaceL2OrFail`:
  - Rejects when source is not L1
  - Rejects when source and target are in same L0 (with suggestion to use `convertSpaceL1ToSpaceL2`)
  - Rejects when source L1 has L2 children (depth overflow)
  - Rejects nameID collision in target L0 scope
  - Changes level from L1 to L2
  - Clears ALL community roles including user admins (cross-L0 boundary invalidates community hierarchy)
  - Updates `levelZeroSpaceID` to target L0's ID
  - Updates `storageAggregator.parentStorageAggregator` to target L1's
  - Calls `setParentRoleSetAndCredentials` with target L1's roleSet

**Checkpoint**: US2 fully functional — L1→L2 cross-L0 demotion works end-to-end. Both mutations independently testable.

---

## Phase 5: User Story 3 — Admin UI for Cross-Space Move Operations (Priority: P1, client-web scope)

**Goal**: Platform admin can trigger cross-space moves from the admin Conversions & Transfers page.

**Independent Test**: Navigate to the admin Conversions & Transfers page, enter an L1 space URL, select "Move" from the toggle, pick a target, confirm, and verify the space appears in its new location.

**NOTE**: This phase is **client-web** (React) scope — out of scope for the server repo. Tasks documented for cross-service coordination.

- [ ] T014 [US3] Verify the existing `spaces` GraphQL query supports filtering by level (e.g., `filter: { level: L0 }`). If not supported, add a `SpaceLevel` filter option to the spaces query resolver in `src/services/api/roles/space/space.resolver.queries.ts` and regenerate schema before proceeding with space pickers

### Implementation for User Story 3 (client-web repo)

- [ ] T015 [US3] Extend operation toggle from `Promote | Demote` to `Promote | Demote | Move` when resolved space is L1 — in the Space Conversions section component of the Conversions & Transfers admin page (client-web `025-admin-transfer-ui`)
- [ ] T016 [US3] Add move-type selector component — two options: "Move to another Space (stays L1)" and "Move under a Subspace in another Space (becomes L2)". Disable "Move under a Subspace" when source L1 has L2 children (FR-026)
- [ ] T017 [P] [US3] Add searchable L0 space picker for "Move to another Space" — queries `spaces(filter: { level: L0 })` excluding current parent L0
- [ ] T018 [P] [US3] Add searchable L1 space picker for "Move under a Subspace" — queries L1 spaces in other L0s, excluding sibling L1s in the same L0
- [ ] T019 [US3] Add confirmation dialog with move-specific warnings — for L1→L1: warns community cleared + content moves + innovation flow may differ + existing URLs/bookmarks will break (no redirects). For L1→L2: warns demotion + ALL community roles cleared including admins (cross-L0 boundary) + existing URLs/bookmarks will break. Per FR-027/FR-028
- [ ] T020 [US3] Wire GraphQL mutations (`moveSpaceL1ToSpaceL0`, `moveSpaceL1ToSpaceL2`) with loading indicator, duplicate submission prevention, success/error message display (FR-030, FR-031, FR-032)

**Checkpoint**: Admin UI complete — platform admins can trigger cross-space moves from the web interface.

---

## Phase 6: User Story 4 — Auto-Invite Overlapping Members After Move (Priority: P3)

**Goal**: After a cross-L0 move clears community memberships, the platform admin can opt in to sending automatic invitations to former community members who are also members of the target L0 space's community (the overlap set).

**Independent Test**: Create two L0 spaces with overlapping members. Create an L1 subspace under the first L0 with community members. Move the L1 to the second L0 with auto-invite enabled. Verify that only overlapping members receive invitations with the admin's custom message.

**Dependencies**: Requires US1 (T008-T009) to be complete. Modifies the same service/resolver files.

### Implementation for User Story 4

- [x] T021 [P] [US4] Add optional `autoInvite` (boolean, default false) and `invitationMessage` (string, nullable) fields to `MoveSpaceL1ToSpaceL0Input` in `src/services/api/conversion/dto/move.dto.space.l1.to.space.l0.input.ts` — `@Field(() => Boolean, { nullable: true, defaultValue: false })` and `@Field(() => String, { nullable: true })`. Per FR-033
- [x] T022 [P] [US4] Add the same optional `autoInvite` and `invitationMessage` fields to `MoveSpaceL1ToSpaceL2Input` in `src/services/api/conversion/dto/move.dto.space.l1.to.space.l2.input.ts`. Per FR-033
- [x] T023 [US4] Add private method `dispatchAutoInvitesAfterMove(removedActorIds: string[], targetL0Id: string, movedSpaceId: string, createdBy: string, invitationMessage?: string): Promise<void>` to `src/services/api/conversion/conversion.service.ts`:
  1. Load target L0 community members via `getSpaceCommunityRoles(targetL0.community.roleSet)` — extract user IDs only (not orgs/VCs)
  2. Compute overlap: `removedActorIds.filter(id => targetL0MemberIds.has(id))`
  3. Resolve the moved space's roleSet and community for notification payloads via `communityResolverService.getCommunityForRoleSet(roleSetID)`
  4. For each overlap user: call `roleSetService.createInvitationExistingActor()` (NOT `invitationService.createInvitation()` — that method doesn't exist) with `{ invitedActorID, welcomeMessage, createdBy, roleSetID, invitedToParent: false, extraRoles: [] }`. Then dispatch notification via `void notificationUserAdapter.userSpaceCommunityInvitationCreated(notificationInput)` (fire-and-forget)
  5. After all invitations are created, apply authorization policies on the batch via `resetAuthorizationsOnRoleSetInvitations(roleSetID)` — uses `roleSetAuthorizationService.applyAuthorizationPolicyOnInvitationsApplications()` then `authorizationPolicyService.saveAll()`. Without this, invitations have bare `AuthorizationPolicy` with no credential rules
  6. This is best-effort post-commit — outer try/catch logs errors with `LogContext.CONVERSION`, never throws (FR-036). Inner try/catch per invitation allows partial success
- [x] T024 [US4] Wire auto-invite into both resolver mutations in `src/services/api/conversion/conversion.resolver.mutations.ts` — after fire-and-forget room handling (T009 step 9, T012 step 7): if `moveData.autoInvite === true`, call `void this.conversionService.dispatchAutoInvitesAfterMove(removedActorIds, targetL0Id, space.id, moveData.invitationMessage)` as fire-and-forget. Per FR-036: MUST NOT block or delay the move response
- [x] T025 [US4] Add unit tests for `dispatchAutoInvitesAfterMove` in `src/services/api/conversion/conversion.service.move.spec.ts`:
  - Sends invitations only to overlap set (old members ∩ target L0 members)
  - Does NOT invite users who were in old community but NOT in target L0 community
  - Uses admin's custom message when provided
  - Uses generated default message when invitationMessage is undefined
  - Does not throw on invitation failure (logs error, continues)
  - Sends zero invitations when overlap set is empty (FR-038)
- [ ] T026 [US4] (client-web) Add auto-invite checkbox and message textbox to both move confirmation dialogs — checkbox labeled "Send invitations to community members who are already in the destination space" (unchecked by default, FR-039). Helper text explains overlap logic (FR-040). Message textbox visible only when checked, pre-populated with default message referencing subspace/source/destination names (FR-041, FR-042). Pass `autoInvite` flag and `invitationMessage` to mutation input (FR-044)

**Checkpoint**: US4 complete — auto-invite works for both move types. Overlap logic independently testable.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Schema contract, integration tests, regression validation

- [ ] T027 [BLOCKED: requires running services] Regenerate GraphQL schema: run `pnpm run schema:print && pnpm run schema:sort` — verify two new mutations appear in `schema.graphql` with correct Input types (including optional autoInvite/invitationMessage fields) and return types. No breaking changes to existing schema
- [ ] T028 [BLOCKED: requires T027] Run `pnpm run schema:diff` against baseline — confirm `change-report.json` shows only ADDITIONS (two mutations, two input types). No BREAKING changes
- [ ] T029 Create integration test in `test/functional/integration/conversion/move-space-cross-l0.it-spec.ts`:
  - Test 1: Move L1 with callouts and L2 children to different L0 → verify content accessible, levelZeroSpaceID updated for all descendants, community empty, authorization reflects new parent
  - Test 2: Move L1 to become L2 under L1 in different L0 → verify level=L2, ALL community roles cleared including admins (cross-L0), content intact
  - Test 3: Reject self-move (same L0) with clear error
  - Test 4: Reject nameID collision with error containing `conflictingNameID`
  - Test 5: Reject depth overflow for L1→L2 when source has L2 children
  - Test 6: After L1→L1 cross-L0 move, verify visibility state and privacy mode are unchanged (FR-021)
  - Test 7: After L1→L1 cross-L0 move, verify moved space resolves to the target L0's Account and license entitlements are propagated (FR-021b)
- [ ] T030 Regression validation: run existing conversion tests to verify `convertSpaceL1ToSpaceL2`, `convertSpaceL2ToSpaceL1`, and `convertSpaceL1ToSpaceL0` continue to work unchanged. Run `pnpm test -- src/services/api/conversion/`
- [ ] T031 Run full CI test suite: `pnpm test:ci:no:coverage` — verify no regressions across the codebase
- [ ] T032 Run quickstart.md manual validation — follow the 6-step manual testing procedure in `specs/083-cross-space-moves/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on T003 (module wiring) from Setup — BLOCKS all user stories
- **US1 (Phase 3)**: Depends on Phase 2 completion. Depends on T001 (DTO)
- **US2 (Phase 4)**: Depends on Phase 2 completion. Depends on T002 (DTO). Independent of US1 — can run in parallel
- **US3 (Phase 5)**: Depends on US1 (T009) and US2 (T012) being merged — needs mutations to exist in schema. Client-web repo scope
- **US4 (Phase 6)**: Depends on US1 (T009) completion — modifies same service/resolver files. Can start after US1 is done
- **Polish (Phase 7)**: Depends on US1 and US2 backend completion (T009, T012). US4 is optional before polish

### User Story Dependencies

```
Phase 1: Setup
  T001 ─┐
  T002 ─┤
  T003 ─┘
         ↓
Phase 2: Foundational
  T004, T005, T006, T007 (all [P] — can run in parallel)
         ↓
  ┌──────┴──────┐
  ↓             ↓
Phase 3: US1   Phase 4: US2    ← Can run in PARALLEL
  T008→T009→T010  T011→T012→T013
  ↓             ↓
  └──────┬──────┘
         ↓
Phase 5: US3 (client-web, needs schema from US1+US2)
  T014→T015→T016→T017∥T018→T019→T020
         ↓
Phase 6: US4 (depends on US1, modifies same files)
  T021∥T022→T023→T024→T025
  T026 (client-web, parallel with server tasks)
         ↓
Phase 7: Polish
  T027→T028→T029→T030→T031→T032
```

### Within Each User Story

- Service method before resolver mutation (service is called by resolver)
- Resolver before unit tests (tests validate the implementation)
- Schema regeneration after both US1 and US2 resolvers are complete

### Parallel Opportunities

**Phase 1**: T001 and T002 are fully parallel (different files)
**Phase 2**: T004, T005, T006, T007 are parallel (different methods, same file but independent logic)
**Phase 3 + Phase 4**: US1 and US2 can run in parallel after Phase 2
**Phase 5**: T017 and T018 are parallel (different picker components)
**Phase 6**: T021 and T022 are parallel (different DTO files)

---

## Implementation Strategy

### MVP First (US1 Only — Server Backend)

1. Complete Phase 1: Setup (T001-T003)
2. Complete Phase 2: Foundational helpers (T004-T007)
3. Complete Phase 3: US1 — `moveSpaceL1ToSpaceL0` mutation (T008-T010)
4. **STOP and VALIDATE**: Test US1 via GraphQL playground (quickstart.md step 4)
5. Regenerate schema (T027) — mutation is usable via API

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. Add US1 → Test independently → Schema updated (MVP!)
3. Add US2 → Test independently → Full backend API complete
4. Add US3 (client-web) → Test via admin UI → Core feature delivered
5. Add US4 → Test auto-invite independently → Feature fully delivered
6. Polish → Integration tests + regression validation → Production ready

### Single Developer Strategy

Execute sequentially in priority order:
1. Phase 1 → Phase 2 → Phase 3 (US1) → Phase 4 (US2) → Phase 6 (US4) → Phase 7 (Polish)
2. US3 (client-web) can be deferred or handled by frontend developer

### Parallel Team Strategy

With two developers on the server repo:
1. Both complete Phase 1 + Phase 2 together
2. Developer A: US1 (Phase 3) then US4 (Phase 6)
3. Developer B: US2 (Phase 4)
4. Merge both, then Phase 7 together
5. Frontend developer: US3 (Phase 5) + US4 frontend (T026) after schema is merged to develop

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- US1 and US2 are independently testable — each adds a working mutation
- US3 depends on US1+US2 mutations being in the schema but is a separate repo
- US4 depends on US1 (modifies same service/resolver files) but is independently testable as P3 convenience feature
- Both service methods return `{ space, removedActorIds }` so the resolver can pass actor IDs to `handleRoomsDuringMove()`
- Both service methods share the same file — coordinate if working in parallel to avoid merge conflicts in `conversion.service.ts`
- Existing conversion mutations (`convertSpaceL1ToSpaceL2`, etc.) must NOT be modified — regression risk per spec FR-012
- Moved space is placed at sortOrder 0 (first position) — differs from existing conversions which append to last. Admin can rearrange order afterwards
