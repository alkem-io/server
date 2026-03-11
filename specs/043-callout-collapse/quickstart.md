# Quickstart: 043-callout-collapse

## Prerequisites

- Local services running: `pnpm run start:services`
- Database migrated: `pnpm run migration:run`

## Verify the Feature

### 1. Start the server

```bash
pnpm start:dev
```

### 2. Check schema generation

```bash
pnpm run schema:print && pnpm run schema:sort
```

Verify `CalloutDescriptionDisplayMode` enum, `SpaceSettingsLayout` type, and `layout` field appear in `schema.graphql`.

### 3. Query existing space settings

```graphql
query {
  space(ID: "<space-id>") {
    settings {
      layout {
        calloutDescriptionDisplayMode
      }
    }
  }
}
```

Expected: `EXPANDED` for existing spaces (post-migration).

### 4. Update the display mode

```graphql
mutation {
  updateSpaceSettings(settingsData: {
    spaceID: "<space-id>"
    settings: {
      layout: {
        calloutDescriptionDisplayMode: COLLAPSED
      }
    }
  }) {
    settings {
      layout {
        calloutDescriptionDisplayMode
      }
    }
  }
}
```

Expected: Returns `COLLAPSED`.

### 5. Create a new space and verify default

After creating a new space, query its settings. Expected: `calloutDescriptionDisplayMode: COLLAPSED`.

## Run Tests

```bash
pnpm test:ci:no:coverage
```
