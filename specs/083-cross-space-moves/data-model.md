# Data Model: Cross-Space Moves

**Feature**: 083-cross-space-moves | **Date**: 2026-03-30

## Entity Impact Summary

No new entities or database migrations are required. All changes operate on existing entity fields and relations. The move operations update in-place references on existing rows.

---

## Entities Modified During Move

### Space

**Entity**: `src/domain/space/space/space.entity.ts`
**Table**: `space` (extends `actor` via CTI)

| Field | Type | Modified By | Notes |
|-------|------|-------------|-------|
| `level` | `int` (SpaceLevel enum) | `moveSpaceL1ToSpaceL2` only | Changed from L1 (1) to L2 (2) |
| `parentSpace` | `ManyToOne(Space)` | Both mutations | FK updated to target parent |
| `levelZeroSpaceID` | `uuid` | Both mutations | Updated to target L0's ID for moved space + all descendants |
| `sortOrder` | `int` | Both mutations | Set to 0 (first position); existing children shifted up by 1 |
| `settings` | `jsonb` (ISpaceSettings) | Preserved | No changes — settings carry over |
| `visibility` | `varchar` (SpaceVisibility) | Preserved | FR-021: state preserved on move |
| `platformRolesAccess` | `jsonb` | Both mutations | Recalculated by `applyAuthorizationPolicy()` |

**Bulk update for descendants** (via QueryBuilder):
```sql
UPDATE space
SET "levelZeroSpaceID" = :targetL0Id
WHERE id IN (:...allDescendantIds)
```

### AuthorizationPolicy

**Entity**: `src/domain/common/authorization-policy/authorization.policy.entity.ts`
**Table**: `authorization_policy`

| Field | Type | Modified By | Notes |
|-------|------|-------------|-------|
| `parentAuthorizationPolicy` | `ManyToOne(AuthorizationPolicy)` | Both mutations | Updated to new parent's auth policy |
| `credentialRules` | `jsonb` | Both mutations | Reset and rebuilt by `applyAuthorizationPolicy()` |
| `privilegeRules` | `jsonb` | Both mutations | Reset and rebuilt by `applyAuthorizationPolicy()` |

Updated recursively for the moved space and its entire subtree via `SpaceAuthorizationService.applyAuthorizationPolicy()`.

### RoleSet

**Entity**: `src/domain/access/role-set/role.set.entity.ts`
**Table**: `role_set`

| Field | Type | Modified By | Notes |
|-------|------|-------------|-------|
| `parentRoleSet` | `ManyToOne(RoleSet)` | Both mutations | Updated to target parent's roleSet |

Updated via `RoleSetService.setParentRoleSetAndCredentials(childRoleSet, parentRoleSet)`.

### Role (RoleDefinition)

**Entity**: `src/domain/access/role/role.entity.ts`
**Table**: `role`

| Field | Type | Modified By | Notes |
|-------|------|-------------|-------|
| `parentCredentials` | `jsonb` (ICredentialDefinition[]) | Both mutations | Updated by `setParentRoleSetAndCredentials()` |

### Credential (on Actors)

**Entity**: `src/domain/actor/credential/credential.entity.ts`
**Table**: `credential`

Rows **deleted** during community clearing:
- `SPACE_MEMBER` credentials for all cleared members
- `SPACE_LEAD` credentials for all cleared leads
- `SPACE_ADMIN` credentials for all cleared admins (both cross-L0 mutations — crossing L0 boundary invalidates the entire community hierarchy)
- `SPACE_SUBSPACE_ADMIN` implicit credentials on parent space

No credentials re-created for cross-L0 moves — all roles are cleared because the community hierarchy changes entirely.

### StorageAggregator

**Entity**: `src/domain/storage/storage-aggregator/storage.aggregator.entity.ts`
**Table**: `storage_aggregator`

| Field | Type | Modified By | Notes |
|-------|------|-------------|-------|
| `parentStorageAggregator` | `ManyToOne(StorageAggregator)` | Both mutations | Updated to target parent's storage aggregator |

**Chain**:
- L1→L1 move: `movedSpace.storageAggregator.parentStorageAggregator = targetL0.storageAggregator`
- L1→L2 move: `movedSpace.storageAggregator.parentStorageAggregator = targetL1.storageAggregator`

### Tagset (Classification)

**Entity**: `src/domain/common/tagset/tagset.entity.ts`
**Table**: `tagset`

| Field | Type | Modified By | Notes |
|-------|------|-------------|-------|
| `tags` | `simple-array` | Both mutations | FLOW_STATE tagset updated to target L0's default state |
| `tagsetTemplate` | `ManyToOne(TagsetTemplate)` | Both mutations | Repointed to target L0's flow state template |

Updated per-callout via `ClassificationService.updateTagsetTemplateOnSelectTagset()`.

### Communication (indirect, via 084)

**Entity**: `src/domain/communication/communication/communication.entity.ts`
**Table**: `communication`

| Field | Type | Modified By | Notes |
|-------|------|-------------|-------|
| `updates` | `OneToOne(Room)` | 084 post-commit | Old updates room deleted, new one created and linked |

Handled by `SpaceMoveRoomsService.handleRoomsDuringMove()` — fire-and-forget.

---

## Entities NOT Modified

| Entity | Reason |
|--------|--------|
| `Account` | L1 spaces don't carry Account references; Account is resolved via `levelZeroSpaceID → L0 → account` |
| `Collaboration` | Container entity — no fields change; callout sync happens at Tagset level |
| `InnovationFlow` | The target L0's innovation flow is read-only (used as template source) |
| `Community` | Container entity — no fields change; role clearing happens at RoleSet/Credential level |
| `Profile` | Preserved as-is; only URL cache is invalidated |
| `License` | L1/L2 spaces inherit licensing through Account chain |
| `TemplatesManager` | Only exists on L0 spaces |
| `Room` | Callout/post rooms preserved; updates rooms handled by 084 |

---

## Validation Rules

| Rule | Scope | Error |
|------|-------|-------|
| Source must be L1 | Both mutations | `ValidationException`: "Only L1 spaces can be moved cross-L0" |
| Target must be L0 (for L1→L1) | `moveSpaceL1ToSpaceL0` | `ValidationException`: "Target must be an L0 space" |
| Target must be L1 in different L0 (for L1→L2) | `moveSpaceL1ToSpaceL2` | `ValidationException`: "Target must be an L1 space in a different L0" |
| Not a self-move | Both mutations | `ValidationException`: "Cannot move space to its current parent" |
| No depth overflow | `moveSpaceL1ToSpaceL2` | `ValidationException`: "Source L1 has L2 children; moving to L2 would exceed max depth" |
| No nameID collision | Both mutations | `ValidationException`: "NameID collision in target L0 scope", `{ conflictingNameID }` |
| Platform admin required | Both mutations | `ForbiddenException` (via authorization guard) |

---

## State Transitions

### moveSpaceL1ToSpaceL0 (L1 stays L1, changes L0 parent)

```
BEFORE                              AFTER
──────                              ─────
Space (L1)                          Space (L1)
  .parentSpace = sourceL0             .parentSpace = targetL0
  .levelZeroSpaceID = sourceL0.id     .levelZeroSpaceID = targetL0.id
  .sortOrder = N                      .sortOrder = 0 (first in target)
  .community.roleSet                  .community.roleSet
    .parentRoleSet = sourceL0.rs        .parentRoleSet = targetL0.rs
    [members, leads, admins]            [EMPTY — all cleared]
  .storageAggregator                  .storageAggregator
    .parent = sourceL0.sa               .parent = targetL0.sa
  .authorization                      .authorization
    .parent = sourceL0.auth             .parent = targetL0.auth
  .collaboration                      .collaboration
    .callouts[].classification          .callouts[].classification
      .FLOW_STATE = sourceState           .FLOW_STATE = targetDefault

All L2 descendants:                 All L2 descendants:
  .levelZeroSpaceID = sourceL0.id     .levelZeroSpaceID = targetL0.id
  (community cascaded clear)          (credentials revoked via cascade)
```

### moveSpaceL1ToSpaceL2 (L1 becomes L2 under target L1 in different L0)

```
BEFORE                              AFTER
──────                              ─────
Space (L1)                          Space (L2)
  .level = 1                          .level = 2
  .parentSpace = sourceL0             .parentSpace = targetL1
  .levelZeroSpaceID = sourceL0.id     .levelZeroSpaceID = targetL0.id
  .sortOrder = N                      .sortOrder = 0 (first in target)
  .community.roleSet                  .community.roleSet
    .parentRoleSet = sourceL0.rs        .parentRoleSet = targetL1.rs
    [members, leads, admins]            [EMPTY — all cleared (cross-L0)]
  .storageAggregator                  .storageAggregator
    .parent = sourceL0.sa               .parent = targetL1.sa
  .authorization                      .authorization
    .parent = sourceL0.auth             .parent = targetL1.auth
```

---

## Query Patterns

### Validate nameID uniqueness in target L0

```typescript
// Existing service method:
const reservedNameIDs = await this.namingService.getReservedNameIDsInLevelZeroSpace(targetL0Id);

// Collect moved subtree nameIDs:
const movedSpaces = await this.spaceRepository.find({
  where: [
    { id: movedSpaceId },
    { parentSpace: { id: movedSpaceId } }, // L2 children
  ],
  select: { id: true, nameID: true },
});

// Check for collisions:
for (const space of movedSpaces) {
  if (reservedNameIDs.includes(space.nameID)) {
    throw new ValidationException('NameID collision in target L0 scope', LogContext.CONVERSION, {
      conflictingNameID: space.nameID,
    });
  }
}
```

### Bulk update levelZeroSpaceID

```typescript
const allDescendantIds = await this.spaceLookupService.getAllDescendantSpaceIDs(movedSpaceId);
const allIdsToUpdate = [movedSpaceId, ...allDescendantIds];

await this.spaceRepository
  .createQueryBuilder()
  .update(Space)
  .set({ levelZeroSpaceID: targetL0Id })
  .whereInIds(allIdsToUpdate)
  .execute();
```

### Load target L0 with required relations

```typescript
const targetL0 = await this.spaceService.getSpaceOrFail(targetL0Id, {
  relations: {
    storageAggregator: true,
    community: { roleSet: true },
    collaboration: {
      calloutsSet: { tagsetTemplateSet: { tagsetTemplates: true } },
    },
  },
});
```
