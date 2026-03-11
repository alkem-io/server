# Quickstart: Subspace Sorting & Pinning API

**Branch**: `041-subspace-sorting-pinning`

## Prerequisites

- Server running locally (`pnpm start:dev`)
- Database migrated (`pnpm run migration:run`)
- Authenticated as a space admin

## New GraphQL Operations

### Set Sort Mode

```graphql
mutation UpdateSpaceSettings($settingsData: UpdateSpaceSettingsInput!) {
  updateSpaceSettings(settingsData: $settingsData) {
    id
    settings {
      sortMode
    }
  }
}

# Variables:
{
  "settingsData": {
    "spaceID": "<space-id>",
    "settings": {
      "sortMode": "CUSTOM"
    }
  }
}
```

### Pin a Subspace

```graphql
mutation PinSubspace($pinnedData: UpdateSubspacePinnedInput!) {
  updateSubspacePinned(pinnedData: $pinnedData) {
    id
    pinned
    sortOrder
  }
}

# Variables:
{
  "pinnedData": {
    "spaceID": "<parent-space-id>",
    "subspaceID": "<subspace-id>",
    "pinned": true
  }
}
```

### Unpin a Subspace

Same mutation as above with `"pinned": false`.

### Query Subspaces with Sorting Data

```graphql
query GetSpaceWithSubspaces($spaceId: UUID!) {
  lookup {
    space(ID: $spaceId) {
      settings {
        sortMode
      }
      subspaces {
        id
        pinned
        sortOrder
        profile {
          displayName
        }
      }
    }
  }
}
```

### Reorder Subspaces (existing, unchanged)

```graphql
mutation ReorderSubspaces($sortOrderData: UpdateSubspacesSortOrderInput!) {
  updateSubspacesSortOrder(sortOrderData: $sortOrderData) {
    id
    sortOrder
    pinned
  }
}
```

## Client-Side Sorting Logic

The server returns raw data. The client implements display ordering:

1. Split subspaces into `pinned` and `non-pinned` groups
2. Sort pinned subspaces by `sortOrder` ascending
3. Sort non-pinned subspaces by:
   - `sortOrder` ascending (if `sortMode === "CUSTOM"`)
   - `profile.displayName` alphabetically (if `sortMode === "ALPHABETICAL"`)
4. Concatenate: pinned first, then non-pinned

## Verification Steps

1. Query a space's settings - confirm `sortMode` is `"ALPHABETICAL"` (default)
2. Update sort mode to `"CUSTOM"` - confirm it persists
3. Pin a subspace - confirm `pinned: true` in query response
4. Unpin the subspace - confirm `pinned: false`
5. Pin the same subspace twice - confirm idempotent (no error)
6. Call `updateSubspacesSortOrder` - confirm it still works as before
