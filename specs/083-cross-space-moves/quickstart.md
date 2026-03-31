# Quickstart: Cross-Space Moves Implementation

**Feature**: 083-cross-space-moves | **Date**: 2026-03-30

## Prerequisites

- Branch: `083-cross-space-moves` (based on `develop` with `084-move-room-handling` merged)
- Services running: `pnpm run start:services` (PostgreSQL, RabbitMQ, Redis, Ory)
- Migrations current: `pnpm run migration:run`

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│ ConversionResolverMutations                                     │
│   moveSpaceL1ToSpaceL0()  ──→  ConversionService                │
│   moveSpaceL1ToSpaceL2()  ──→    .moveSpaceL1ToSpaceL0OrFail() │
│                                  .moveSpaceL1ToSpaceL2OrFail() │
│                                                                 │
│ ConversionService (extended)                                    │
│   ├── NamingService          (nameID collision check)           │
│   ├── RoleSetService         (community clearing + re-add)      │
│   ├── SpaceService           (structural updates)               │
│   ├── SpaceLookupService     (descendant resolution)            │
│   ├── ClassificationService  (flow state sync)                  │
│   ├── CalloutsSetService     (tagset template lookup)           │
│   └── SpaceMoveRoomsService  (084 fire-and-forget)              │
│                                                                 │
│ Post-commit (resolver):                                         │
│   ├── SpaceAuthorizationService  (auth chain rebuild)           │
│   ├── UrlGeneratorCacheService   (cache invalidation)           │
│   └── SpaceMoveRoomsService      (room handling)                │
└─────────────────────────────────────────────────────────────────┘
```

## Implementation Order

### Step 1: Input DTOs (2 files, ~20 lines each)

Create two new Input types:

```
src/services/api/conversion/dto/
├── move.dto.space.l1.to.space.l0.input.ts   # MoveSpaceL1ToSpaceL0Input
└── move.dto.space.l1.to.space.l2.input.ts   # MoveSpaceL1ToSpaceL2Input
```

Follow the pattern of existing `ConvertSpaceL1ToSpaceL2Input`. Each has two UUID fields plus optional auto-invite fields (`autoInvite: boolean = false`, `invitationMessage?: string`) per FR-033.

### Step 2: Service Methods (in ConversionService)

Add to `src/services/api/conversion/conversion.service.ts`:

#### `moveSpaceL1ToSpaceL0OrFail(moveData: MoveSpaceL1ToSpaceL0Input): Promise<ISpace>`

High-level flow:
```
1. Load source L1 with: community.roleSet, storageAggregator, subspaces
2. Load target L0 with: storageAggregator, community.roleSet,
     collaboration.calloutsSet.tagsetTemplateSet.tagsetTemplates
3. Validate: source is L1, target is L0, different L0s, no nameID collisions
4. getSpaceCommunityRoles(roleSetL1) → collect ALL actor IDs
5. removeContributors(roleSetL1, roles) → clear members + leads
6. Remove admins explicitly: removeActorFromRole(ADMIN, adminId)
7. Update: parentSpace = targetL0, levelZeroSpaceID = targetL0.id
8. Bulk update descendant levelZeroSpaceIDs
9. Update: storageAggregator.parentStorageAggregator = targetL0.storageAggregator
10. setParentRoleSetAndCredentials(roleSetL1, roleSetL0)
11. Sync FLOW_STATE tagsets with target L0's innovation flow template
12. Update sortOrder to last position
13. Save and return space + removedActorIds + autoInvite flag
```

**Post-commit (in resolver)**: If `autoInvite` is true, compute overlap set (old L1 members ∩ target L0 members) and create invitations as fire-and-forget (FR-034–FR-038).

#### `moveSpaceL1ToSpaceL2OrFail(moveData: MoveSpaceL1ToSpaceL2Input): Promise<ISpace>`

High-level flow:
```
1. Load source L1 with: community.roleSet, storageAggregator, subspaces
2. Load target L1 with: storageAggregator, community.roleSet
3. Load target L0 (via target L1's levelZeroSpaceID) with:
     collaboration.calloutsSet.tagsetTemplateSet.tagsetTemplates
4. Validate: source is L1, target is L1, different L0s, no L2 children on source, no nameID collision
5. getSpaceCommunityRoles(roleSetL1) → collect ALL actor IDs (admins cleared for cross-L0)
6. removeContributors(roleSetL1, roles) → clear members + leads + orgs + VCs
7. Remove admins explicitly: removeActorFromRole(ADMIN, adminId) for each
8. Update: level = L2, parentSpace = targetL1, levelZeroSpaceID = targetL0.id
9. Update: storageAggregator.parentStorageAggregator = targetL1.storageAggregator
10. setParentRoleSetAndCredentials(roleSetL1, roleSetTargetL1)
11. Sync FLOW_STATE tagsets with target L0's innovation flow template
12. Update sortOrder to last position
13. Save and return space
```

### Step 3: Resolver Mutations

Add to `src/services/api/conversion/conversion.resolver.mutations.ts`:

Two new mutations following the existing `convertSpaceL1ToSpaceL2` pattern:

```typescript
@Mutation(() => ISpace, { description: '...' })
async moveSpaceL1ToSpaceL0(
  @Args('moveData') moveData: MoveSpaceL1ToSpaceL0Input
): Promise<ISpace> {
  // 1. Authorization: PLATFORM_ADMIN
  // 2. Call service: moveSpaceL1ToSpaceL0OrFail(moveData)
  // 3. Save space
  // 4. Apply authorization policy (with target L0's auth as parent)
  // 5. Save all authorization policies
  // 6. Invalidate URL caches for subtree
  // 7. Fire-and-forget: spaceMoveRoomsService.handleRoomsDuringMove()
  // 8. Return space
}
```

### Step 4: Module Wiring

In `src/services/api/conversion/conversion.module.ts`:
- Import `SpaceMoveRoomsModule` from `@domain/communication/space-move-rooms/space.move.rooms.module`
- Import `NamingModule` if not already present
- Ensure `CalloutsSetModule` and `ClassificationModule` are imported for tagset sync

### Step 5: Schema Regeneration

```bash
pnpm run schema:print && pnpm run schema:sort
```

This adds the two new mutations to `schema.graphql`. No breaking changes.

### Step 6: Unit Tests

Create `src/services/api/conversion/conversion.service.move.spec.ts`:

Key test cases:
- Rejects non-L1 source space
- Rejects self-move (same L0)
- Rejects nameID collision
- Rejects L1→L2 when source has L2 children
- Updates levelZeroSpaceID for moved space and descendants
- Clears ALL community roles for L1→L1
- Clears ALL community roles for L1→L2 (cross-L0 invalidates hierarchy)
- Updates storage aggregator parent
- Updates roleSet parent and credentials

### Step 7: Integration Tests

Create `test/functional/integration/conversion/move-space-cross-l0.it-spec.ts`:

Key scenarios:
- Move L1 with callouts and L2 children to different L0 → all content accessible
- Community memberships are cleared post-move
- Authorization reflects new parent
- URL resolves under new L0

## Key Reference Files

| File | Purpose |
|------|---------|
| `src/services/api/conversion/conversion.service.ts` | Add move methods here |
| `src/services/api/conversion/conversion.resolver.mutations.ts` | Add resolver mutations here |
| `src/domain/space/space/space.entity.ts` | Space entity reference |
| `src/domain/access/role-set/role.set.service.ts` | RoleSet parent linking |
| `src/domain/common/classification/classification.service.ts` | Tagset sync |
| `src/services/infrastructure/naming/naming.service.ts` | NameID validation |
| `src/domain/communication/space-move-rooms/space.move.rooms.service.ts` | 084 dependency |
| `src/domain/space/space/space.service.authorization.ts` | Auth policy application |
| `src/services/infrastructure/url-generator/url.generator.service.cache.ts` | Cache invalidation |

## Debugging

- **Move fails silently**: Check Winston logs with `LogContext.CONVERSION`
- **Auth not propagated**: Verify `applyAuthorizationPolicy` is called with correct parent auth
- **Old URLs still resolve**: URL cache TTL is 1s — wait or manually revoke
- **Room memberships not revoked**: Check RabbitMQ management console; 084 logs with `LogContext.COMMUNICATION`
- **NameID collision false positive**: Check `NamingService.getReservedNameIDsInLevelZeroSpace` includes the moved space's own nameIDs (they shouldn't conflict with themselves)

## Manual Testing

1. Start services: `pnpm run start:services && pnpm run migration:run && pnpm start:dev`
2. Create two L0 spaces via GraphQL playground
3. Create an L1 subspace with callouts under the first L0
4. Execute `moveSpaceL1ToSpaceL0` mutation
5. Verify: subspace appears under second L0, community is empty, content is intact
6. Execute `moveSpaceL1ToSpaceL2` with a fresh L1 (verify same flow with demotion)
