# API Contract: moveSpaceL1ToSpaceL2

**Feature**: 083-cross-space-moves | **Date**: 2026-03-30
**Type**: GraphQL Mutation

## Mutation

```graphql
type Mutation {
  """
  Move an L1 subspace to become an L2 sub-subspace under a target L1 in a
  different L0 space. The space is demoted from level 1 to level 2 and nested
  under the target L1. All community roles are cleared.
  Requires platform admin privileges.
  """
  moveSpaceL1ToSpaceL2(moveData: MoveSpaceL1ToSpaceL2Input!): Space!
}
```

## Input

```graphql
input MoveSpaceL1ToSpaceL2Input {
  """UUID of the L1 subspace to move and demote to L2."""
  spaceL1ID: UUID!

  """UUID of the target L1 subspace in a different L0 (new parent for the demoted space)."""
  targetSpaceL1ID: UUID!
}
```

## Response

Returns the full `Space` object at its new location. The space now has `level: L2` and is nested under the target L1.

## Authorization

- **Required**: Platform Admin privilege (checked against global authorization policy)
- **Pattern**: Same as existing `convertSpaceL1ToSpaceL2` — `AuthorizationPrivilege.PLATFORM_ADMIN`

## Validation Rules

| Rule | Error Type | Error Message |
|------|-----------|---------------|
| `spaceL1ID` must reference an L1 space | `EntityNotFoundException` / `ValidationException` | "Space not found" / "Space is not L1" |
| `targetSpaceL1ID` must reference an L1 space | `EntityNotFoundException` / `ValidationException` | "Target space not found" / "Target is not L1" |
| Source and target must be in different L0 spaces | `ValidationException` | "Source and target are in the same L0; use convertSpaceL1ToSpaceL2 instead" |
| Source L1 must have NO L2 children | `ValidationException` | "Cannot demote: source L1 has L2 children that would exceed max nesting depth" |
| No nameID in moved space collides with target L0 scope | `ValidationException` | "NameID collision in target L0 scope", details: `{ conflictingNameID }` |

## Side Effects

### Transactional (atomic with the move)

1. **Demote level**: `space.level` → L2
2. **Re-parent**: `space.parentSpace` → target L1
3. **Update levelZeroSpaceID**: Moved space → target L0's ID (no descendants since L2 children are blocked)
4. **Clear ALL community roles**: Members, leads, admins, orgs, VCs — all removed. Differs from same-L0 `convertSpaceL1ToSpaceL2` (which preserves admins) because crossing the L0 boundary invalidates the community hierarchy
5. **Update storage aggregator parent**: Points to target L1's storage aggregator
6. **Update roleSet parent**: Links to target L1's community roleSet + propagates credentials
7. **Update sort order**: Set to last position in target L1's children
8. **Sync innovation flow tagsets**: Callout FLOW_STATE tagsets remapped to target L0's states
9. **Apply authorization policy**: Auth chain rebuilt from target L1

### Post-Commit (best-effort, non-blocking)

10. **Invalidate URL caches**: Space profile cache revoked
11. **Handle rooms (084)**: `SpaceMoveRoomsService.handleRoomsDuringMove(spaceId, removedActorIds)` — membership revocation, updates room recreation

## Sequence Diagram

```
Client → Resolver: moveSpaceL1ToSpaceL2(moveData)
  Resolver → AuthGuard: check PLATFORM_ADMIN
  Resolver → ConversionService: moveSpaceL1ToSpaceL2OrFail(moveData)
    Service → SpaceService: load source L1 (verify no L2 children)
    Service → SpaceService: load target L1 (verify different L0)
    Service → NamingService: validate nameID (source only, no descendants)
    Service → RoleSetService: getSpaceCommunityRoles() → collect actors
    Service → RoleSetService: removeContributors() (members, leads, orgs, VCs)
    Service → RoleSetService: removeActorFromRole() for each admin
    Service → Space: update level=L2, parentSpace=targetL1, levelZeroSpaceID=targetL0.id
    Service → StorageAggregator: update parent reference
    Service → RoleSetService: setParentRoleSetAndCredentials(roleSetL1, roleSetTargetL1)
    Service → ClassificationService: sync FLOW_STATE tagsets
    Service → SpaceService: save(space)
    Service → return space
  Resolver → SpaceService: save(space)
  Resolver → SpaceAuthService: applyAuthorizationPolicy(spaceId, targetL1Auth)
  Resolver → AuthPolicyService: saveAll(policies)
  Resolver → UrlCacheService: revokeUrlCache(space.about.profile.id)
  Resolver → SpaceMoveRoomsService: void handleRoomsDuringMove() [fire-and-forget]
  Resolver → return space
```

## DTO Definition

```typescript
// src/services/api/conversion/dto/move.dto.space.l1.to.space.l2.input.ts

@InputType()
export class MoveSpaceL1ToSpaceL2Input {
  @Field(() => UUID, { description: 'UUID of the L1 subspace to move and demote.' })
  spaceL1ID!: string;

  @Field(() => UUID, { description: 'UUID of the target L1 subspace in a different L0.' })
  targetSpaceL1ID!: string;
}
```

## Example

```graphql
mutation MoveSubspaceUnderAnotherSubspace {
  moveSpaceL1ToSpaceL2(moveData: {
    spaceL1ID: "a1b2c3d4-..."
    targetSpaceL1ID: "i9j0k1l2-..."
  }) {
    id
    nameID
    level
    about {
      profile {
        url
        displayName
      }
    }
  }
}
```

## Differences from Existing convertSpaceL1ToSpaceL2

| Aspect | `convertSpaceL1ToSpaceL2` (existing) | `moveSpaceL1ToSpaceL2` (new) |
|--------|--------------------------------------|------------------------------|
| L0 scope | Same L0 only | Different L0 only |
| levelZeroSpaceID | Unchanged (already correct) | Updated to target L0 |
| Innovation flow | Inherited (same L0) | Synchronized to target L0's states |
| Account context | Unchanged | Changes via levelZeroSpaceID |
| Room handling | None needed | 084 fire-and-forget post-commit |
| Cache invalidation | None needed | URL caches revoked (L0 prefix changes) |
| NameID validation | Not needed (same scope) | Required (different scope) |
| Community/Admins | All cleared except user admins (preserved) | ALL cleared including admins (cross-L0 invalidates community hierarchy) |

## Related

- **Existing within-L0**: `convertSpaceL1ToSpaceL2` (same-L0 demotion — preserved unchanged)
- **Companion**: `moveSpaceL1ToSpaceL0` (cross-L0 lateral move)
- **Dependency**: `SpaceMoveRoomsService` from 084-move-room-handling
