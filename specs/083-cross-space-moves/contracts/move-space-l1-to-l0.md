# API Contract: moveSpaceL1ToSpaceL0

**Feature**: 083-cross-space-moves | **Date**: 2026-03-30
**Type**: GraphQL Mutation

## Mutation

```graphql
type Mutation {
  """
  Move an L1 subspace to a different L0 space. The subspace remains at level 1
  but changes parent from the source L0 to the target L0. All content moves with it.
  All community memberships are cleared. Requires platform admin privileges.
  """
  moveSpaceL1ToSpaceL0(moveData: MoveSpaceL1ToSpaceL0Input!): Space!
}
```

## Input

```graphql
input MoveSpaceL1ToSpaceL0Input {
  """UUID of the L1 subspace to move."""
  spaceL1ID: UUID!

  """UUID of the target L0 space (must be different from current parent L0)."""
  targetSpaceL0ID: UUID!
}
```

## Response

Returns the full `Space` object at its new location. The space retains its ID but all URLs, authorization, and community state reflect the new L0 context.

## Authorization

- **Required**: Platform Admin privilege (checked against global authorization policy)
- **Pattern**: Same as existing `convertSpaceL1ToSpaceL0` — `AuthorizationPrivilege.PLATFORM_ADMIN`

## Validation Rules

| Rule | Error Type | Error Message |
|------|-----------|---------------|
| `spaceL1ID` must reference an L1 space | `EntityNotFoundException` | "Space not found" / `ValidationException` "Space is not L1" |
| `targetSpaceL0ID` must reference an L0 space | `EntityNotFoundException` | "Space not found" / `ValidationException` "Target is not L0" |
| Source L1's current `levelZeroSpaceID` must differ from `targetSpaceL0ID` | `ValidationException` | "Cannot move space to its current parent L0" |
| No nameID in moved subtree collides with target L0 scope | `ValidationException` | "NameID collision in target L0 scope", details: `{ conflictingNameID }` |

## Side Effects

### Transactional (atomic with the move)

1. **Re-parent**: `space.parentSpace` → target L0
2. **Update levelZeroSpaceID**: Moved space + all descendants → target L0's ID
3. **Clear ALL community roles**: Members, leads, admins, orgs, VCs — all removed
4. **Update storage aggregator parent**: Points to target L0's storage aggregator
5. **Update roleSet parent**: Links to target L0's community roleSet + propagates credentials
6. **Update sort order**: Set to last position in target L0's children
7. **Sync innovation flow tagsets**: Callout FLOW_STATE tagsets remapped to target L0's states
8. **Apply authorization policy**: Full subtree auth chain rebuilt from target L0

### Post-Commit (best-effort, non-blocking)

9. **Invalidate URL caches**: Space profile caches revoked for moved subtree
10. **Handle rooms (084)**: `SpaceMoveRoomsService.handleRoomsDuringMove(spaceId, removedActorIds)` — membership revocation, updates room recreation

## Sequence Diagram

```
Client → Resolver: moveSpaceL1ToSpaceL0(moveData)
  Resolver → AuthGuard: check PLATFORM_ADMIN
  Resolver → ConversionService: moveSpaceL1ToSpaceL0OrFail(moveData)
    Service → NamingService: validate nameIDs (pre-check)
    Service → RoleSetService: getSpaceCommunityRoles() → collect all actors
    Service → RoleSetService: removeContributors() + remove admins
    Service → Space: update parentSpace, levelZeroSpaceID, level stays L1
    Service → QueryBuilder: bulk update descendant levelZeroSpaceIDs
    Service → StorageAggregator: update parent reference
    Service → RoleSetService: setParentRoleSetAndCredentials()
    Service → ClassificationService: sync FLOW_STATE tagsets
    Service → SpaceService: save(space)
    Service → return space
  Resolver → SpaceService: save(space)
  Resolver → SpaceAuthService: applyAuthorizationPolicy(spaceId, targetL0Auth)
  Resolver → AuthPolicyService: saveAll(policies)
  Resolver → UrlCacheService: revokeUrlCache() (per space profile)
  Resolver → SpaceMoveRoomsService: void handleRoomsDuringMove() [fire-and-forget]
  Resolver → return space
```

## DTO Definition

```typescript
// src/services/api/conversion/dto/move.dto.space.l1.to.space.l0.input.ts

@InputType()
export class MoveSpaceL1ToSpaceL0Input {
  @Field(() => UUID, { description: 'UUID of the L1 subspace to move.' })
  spaceL1ID!: string;

  @Field(() => UUID, { description: 'UUID of the target L0 space.' })
  targetSpaceL0ID!: string;
}
```

## Example

```graphql
mutation MoveSubspaceToAnotherSpace {
  moveSpaceL1ToSpaceL0(moveData: {
    spaceL1ID: "a1b2c3d4-..."
    targetSpaceL0ID: "e5f6g7h8-..."
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

## Related

- **Existing**: `convertSpaceL1ToSpaceL0` (promotes L1 to independent L0 — different operation)
- **Companion**: `moveSpaceL1ToSpaceL2` (cross-L0 demotion)
- **Dependency**: `SpaceMoveRoomsService` from 084-move-room-handling
