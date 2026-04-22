# Research: Cross-Space Moves

**Feature**: 083-cross-space-moves | **Date**: 2026-03-30
**Purpose**: Resolve all technical unknowns before Phase 1 design

---

## 1. Existing Conversion Service Pattern

**Decision**: Extend `ConversionService` (`src/services/api/conversion/conversion.service.ts`) with two new methods.

**Rationale**: The existing service already handles L1→L2, L2→L1, and L1→L0 conversions. Each follows the same skeleton:
1. Load source and target spaces with required relations
2. Fetch community roles via `getSpaceCommunityRoles(roleSet)`
3. Clear non-admin roles via `removeContributors(roleSet, roles)`
4. Update structural fields (level, parentSpace, levelZeroSpaceID, storageAggregator)
5. Update roleSet parent via `setParentRoleSetAndCredentials()` or `removeParentRoleSet()`
6. Save space
7. Re-add preserved admin roles
8. (In resolver) Apply authorization policy to subtree

The cross-L0 moves add: nameID validation, Account re-association, innovation flow sync, URL cache invalidation, and room handling — but the core skeleton is identical.

**Alternatives considered**:
- **Dedicated MoveService**: Would duplicate `getSpaceCommunityRoles`, `removeContributors`, and the structural update pattern. Rejected because >80% code overlap with ConversionService.
- **Generic `moveSpace` method**: Single method handling both L1→L1 and L1→L2 via a discriminator. Rejected for clarity — the two operations have different community clearing rules (all vs. all-except-admins) and different structural outcomes.

---

## 2. Same-L0 Constraint Enforcement

**Decision**: The existing `convertSpaceL1ToSpaceL2` retains its same-L0 validation (`line 395-399`). The new `moveSpaceL1ToSpaceL2` is a separate method that explicitly handles the cross-L0 case.

**Rationale**: Modifying the existing mutation introduces regression risk. The spec explicitly requires "existing `convertSpaceL1ToSpaceL2` mutation remains unchanged" (FR-012). Two separate code paths eliminate ambiguity about which validations apply.

**Alternatives considered**:
- **Relax the same-L0 constraint**: Would break the existing mutation's contract and require frontend changes. Rejected per spec.
- **Add a `crossL0` flag parameter**: Complicates the existing DTO and mixes concerns. Rejected for violating the single-responsibility principle.

---

## 3. Space Entity — levelZeroSpaceID Propagation

**Decision**: After re-parenting, update `levelZeroSpaceID` for the moved space and all descendants using a recursive query.

**Rationale**: `levelZeroSpaceID` is a denormalized FK stored on every space. It's used for:
- NameID uniqueness scoping (`NamingService.getReservedNameIDsInLevelZeroSpace`)
- Subspace lookup (`WHERE levelZeroSpaceID = ? AND nameID = ?`)
- Account resolution (`SpaceService.getAccountForLevelZeroSpaceOrFail`)

The existing L2→L1 conversion updates it: `spaceL2.levelZeroSpaceID = spaceL0.id`. For cross-L0 moves, ALL descendants must also be updated. The `SpaceLookupService.getAllDescendantSpaceIDs()` method (max depth 10, cycle-safe) already resolves the full subtree for 084's room handling.

**Implementation approach**: Bulk UPDATE via QueryBuilder:
```sql
UPDATE space SET "levelZeroSpaceID" = :targetL0Id
WHERE id IN (:...descendantIds) OR id = :movedSpaceId
```

**Alternatives considered**:
- **Recursive entity traversal + individual saves**: O(n) round-trips. Rejected for performance on large subtrees.
- **Trigger-based propagation**: Would hide logic outside the domain layer, violating Constitution Principle 1. Rejected.

---

## 4. Account Re-Association

**Decision**: Update the moved L1 space's `account` FK to the target L0's Account. Only L0 spaces carry Account references; L1/L2 spaces resolve their Account through `levelZeroSpaceID → L0 → Account`.

**Rationale**: The `account` relation on Space uses `ManyToOne(() => Account, { onDelete: 'SET NULL' })`. Only L0 spaces have non-null `account` references. When an L1 moves to a new L0, its Account lookup path changes automatically via the updated `levelZeroSpaceID`. No explicit Account update is needed on the L1 itself — but the spec requires recalculating storage and license quotas against the target Account (FR-021b).

**Implementation approach**:
1. Load target L0's Account with storageAggregator
2. Update moved space's `storageAggregator.parentStorageAggregator` to target L0's storage aggregator
3. License quota recalculation delegates to `AccountHostService.assignLicensePlansToSpace()` (same as L1→L0 conversion)

**Alternatives considered**:
- **Explicitly set `space.account`** on the L1 space: L1 spaces don't have direct Account references. The Account is always resolved through L0. Setting it would violate the existing convention. Rejected.

---

## 5. Authorization Chain Reset

**Decision**: After structural changes, call `spaceAuthorizationService.applyAuthorizationPolicy(spaceId, parentAuthorization)` — identical to existing conversion resolver pattern.

**Rationale**: The existing `ConversionResolverMutations` follows this pattern for all conversions:
1. Get parent space's authorization: `getParentSpaceAuthorization(spaceId)`
2. Apply to subtree: `applyAuthorizationPolicy(spaceId, parentAuth)`
3. Save all policies: `authorizationPolicyService.saveAll(policies)`

The method recursively:
- Stores `parentAuthorizationPolicy` reference on the space
- Inherits cascading credential rules from parent (for public spaces) or resets (for private)
- Propagates to all subspaces
- Recalculates `platformRolesAccess` per space

No new authorization logic is needed — the existing recursive propagation handles the full subtree.

**Alternatives considered**:
- **Manual per-space auth reset**: Would duplicate the recursive logic. Rejected.
- **Async auth reset via RabbitMQ** (`AUTHORIZATION_RESET_ACCOUNT`): The message-based reset is for background corrections, not for synchronous operations where the caller expects immediate consistency. Rejected.

---

## 6. Community Membership Clearing

**Decision**: Clear ALL community roles including admins for BOTH cross-L0 move types (L1→L1 and L1→L2).

**Rationale**: Per spec clarification (2026-03-31): the determining factor is same-L0 vs cross-L0, not the level change direction. Admin credentials are rooted in the source L0's community chain and are meaningless in the target L0's context. The same-L0 `convertSpaceL1ToSpaceL2` continues to preserve admins (same hierarchy), but any cross-L0 operation clears all roles.

**Implementation approach**:
- Reuse `getSpaceCommunityRoles(roleSet)` to fetch all role assignments
- For BOTH cross-L0 moves: call `removeContributors(roleSet, roles)` then also remove admins explicitly via `removeActorFromRole(roleSet, RoleName.ADMIN, adminId, false)` for each admin

**Descendant clearing**: The moved space's direct community is cleared. For descendants, `removeActorFromRole(MEMBER)` already cascades via `revokeSpaceTreeCredentials()` — removing a member from the L1 revokes their credentials from all L2 children. No explicit per-descendant clearing needed.

**Collecting removed actor IDs for 084**: After clearing, collect all actor IDs that were removed. These are passed to `SpaceMoveRoomsService.handleRoomsDuringMove()`.

---

## 7. Innovation Flow Tagset Synchronization

**Decision**: Reuse the existing `CalloutTransferService.updateClassificationFromTemplates()` pattern to sync callout classification tagsets with the target L0's innovation flow template.

**Rationale**: When an L1 crosses L0 boundaries, its callouts may reference flow states that don't exist in the target L0's innovation flow. The spec requires "same sync pattern as the existing within-L0 conversion service" (FR-018).

The existing `CalloutTransferService` already handles this when transferring callouts between CalloutsSet:
1. Get target CalloutsSet's tagset templates
2. For each template, call `classificationService.updateTagsetTemplateOnSelectTagset()`
3. This remaps each callout's FLOW_STATE tagset to the target's allowed values, falling back to the default state

**Implementation approach**: For each CalloutsSet in the moved subtree:
1. Load target L0's collaboration → innovation flow → tagset template
2. Get the FLOW_STATE tagset template
3. For each callout in the CalloutsSet: `classificationService.updateTagsetTemplateOnSelectTagset(callout.classification.id, flowStateTemplate)`

**Alternatives considered**:
- **Inline sync logic**: Would duplicate what CalloutTransferService already encapsulates. Rejected — extract the shared logic into a reusable method on CalloutsSetService.
- **Skip sync if flow states match**: Optimization, but fragile (states might match by name but differ in semantics). Rejected for first version — always sync.

---

## 8. NameID Collision Validation

**Decision**: Before the move transaction, validate all space nameIDs in the moved subtree against the target L0's reserved nameIDs.

**Rationale**: Space nameIDs must be unique within an L0 scope (the L0 itself + all L1/L2 children). The existing `NamingService.getReservedNameIDsInLevelZeroSpace(targetL0Id)` returns all subspace nameIDs within the target L0. We validate the moved subtree's nameIDs against this set.

**Implementation approach**:
1. `getReservedNameIDsInLevelZeroSpace(targetL0Id)` → `Set<string>`
2. Collect all space nameIDs in the moved subtree (the L1 + its L2 children)
3. For each nameID in moved subtree: check against the reserved set
4. If collision found: throw `ValidationException` with the conflicting nameID
5. Exclude the moved space's own nameIDs from the reserved set (if somehow they're already in the target — shouldn't happen, but defensive)

**Note**: Per spec, only space nameIDs are validated — callout, post, and profile nameIDs are not in scope (FR-008).

**Alternatives considered**:
- **Database unique constraint**: Space nameIDs don't have a DB unique constraint scoped to L0 — they're enforced at application level. Adding one would require a migration and index. Rejected for scope — application-level validation is sufficient and consistent with existing patterns.

---

## 9. URL Cache Invalidation

**Decision**: After the move, invalidate URL caches for all profiles in the moved subtree (spaces, callouts, contributions).

**Rationale**: URLs are constructed from hierarchical nameID paths (`/{l0}/challenges/{l1}/opportunities/{l2}`). When a space moves to a new L0, ALL URLs in the subtree change because the L0 prefix changes. The cache TTL is 1 second, so stale entries expire quickly — but explicit invalidation ensures immediate consistency.

**Implementation approach**: Follow the pattern from `SpaceService.updateSpacePlatformSettings()` (nameID change handler):
1. Load all spaces in the moved subtree with `about.profile` relation
2. For each space: `urlGeneratorCacheService.revokeUrlCache(space.about.profile.id)`

**Note**: Only space profile caches need explicit revocation. Non-space entity caches (callouts, posts, contributions) self-heal via the 1-second cache TTL — no explicit invalidation required.

**Alternatives considered**:
- **Full subtree profile cache flush**: Traverse every callout and contribution in every space. Correct but expensive for large moves. Rejected for first version — space-level invalidation plus 1s TTL is sufficient.
- **No explicit invalidation**: Rely entirely on 1s TTL. Rejected — creates a 1s window where URLs resolve to old paths.

---

## 10. Sort Order and Display Position

**Decision**: Set the moved space's `sortOrder` to position 0 (first) within the target parent, shifting existing children up by 1. The admin can rearrange order manually afterwards.

**Rationale**: FR-020 requires updating sort order within the new parent context. Placing the moved space first makes it immediately visible, confirming the operation succeeded. This differs from the existing subspace creation pattern (which appends to end) — a deliberate choice for move operations where admin verification is the priority.

**Implementation approach**:
1. Shift existing children: `spaceRepository.createQueryBuilder().update(Space).set({ sortOrder: () => '"sortOrder" + 1' }).where('parentSpace.id = :parentId', { parentId: targetParentId }).execute()`
2. Set `movedSpace.sortOrder = 0` (first position)

---

## 11. SpaceMoveRoomsService Integration (084)

**Decision**: Call `spaceMoveRoomsService.handleRoomsDuringMove(movedSpaceId, removedActorIds)` as fire-and-forget AFTER the database transaction commits.

**Rationale**: Per 084's contract:
- The service never throws (all errors logged internally)
- Precondition: DB transaction committed, community memberships cleared
- `removedActorIds` must include ALL cleared actors (users, orgs, VCs)
- Use `void` keyword to suppress TypeScript async warning

**Implementation approach**:
```typescript
// After transaction commit and authorization policy applied:
void this.spaceMoveRoomsService.handleRoomsDuringMove(
  movedSpaceId,
  removedActorIds
);
```

**Module wiring**: Import `SpaceMoveRoomsModule` in `ConversionModule`.

---

## 12. Self-Move / No-Op Detection

**Decision**: Validate that the move is not a no-op before executing.

**Rationale**: FR-009 requires rejecting self-moves with a clear message.

**Implementation approach**:
- L1→L1 cross-L0: Check `sourceL1.levelZeroSpaceID !== targetL0.id`. If equal, reject.
- L1→L2 cross-L0: Check `sourceL1.levelZeroSpaceID !== targetL1.levelZeroSpaceID`. If equal, reject with suggestion to use existing `convertSpaceL1ToSpaceL2` instead.

---

## 13. Depth Overflow Validation (L1→L2 only)

**Decision**: For `moveSpaceL1ToSpaceL2`, reject if the source L1 has any L2 children.

**Rationale**: Moving an L1 with L2 children to become an L2 would make the children L3, exceeding the max nesting depth (MAX_SPACE_LEVEL = 2). Per FR-013, this is a hard block.

**Implementation approach**:
1. Load source L1's subspaces: `spaceRepository.find({ where: { parentSpace: { id: sourceL1Id } } })`
2. If `subspaces.length > 0`: throw `ValidationException` explaining depth overflow

---

## 14. Transaction Boundary

**Decision**: All structural DB changes (re-parent, levelZeroSpaceID update, community clearing, storage aggregator update, roleSet update, sort order, auth policy) are within a single TypeORM transaction. Non-transactional side effects (cache invalidation, room handling) happen post-commit.

**Rationale**: FR-010 requires atomicity. The existing conversion service uses TypeORM's entity save pattern (not explicit `queryRunner.startTransaction`), relying on TypeORM cascade saves. For the bulk `levelZeroSpaceID` update, a QueryBuilder within the same save context ensures transactional consistency.

**Implementation approach**:
1. Service method performs all entity mutations and returns the modified space
2. Resolver saves the space (triggering cascades)
3. Resolver applies authorization policy (separate saves, but acceptable — auth is idempotent)
4. After all saves: fire-and-forget room handling + cache invalidation

---

## 15. Frontend Integration Points

**Decision**: Extend the existing admin Conversions & Transfers page (client-web `025-admin-transfer-ui`) with a "Move" option in the L1 space toggle.

**Rationale**: The spec requires integration into the existing page (FR-022 through FR-032). Two new GraphQL mutations will be called from the frontend.

**Implementation approach** (client-web scope — documented here for completeness):
1. Extend the operation toggle from `Promote | Demote` to `Promote | Demote | Move` when space is L1
2. "Move" shows a move-type selector: "Move to another Space (stays L1)" / "Move under a Subspace (becomes L2)"
3. Searchable space picker component filtered by target type
4. Confirmation dialog with appropriate warnings per move type
5. Loading indicator + duplicate submission prevention
6. Success/error message display

**GraphQL queries needed**:
- `spaces(filter: { level: L0 })` — for L0 target picker (exclude current parent)
- `spaces(filter: { level: L1, levelZeroSpaceID: { not: currentL0 } })` — for L1 target picker in other L0s
