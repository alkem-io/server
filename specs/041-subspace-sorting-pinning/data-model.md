# Data Model: Subspace Sorting & Pinning API

**Branch**: `041-subspace-sorting-pinning` | **Date**: 2026-03-06

## Entity Changes

### Space Entity (`space` table)

**New column**:

| Column   | Type    | Nullable | Default | Description                    |
| -------- | ------- | -------- | ------- | ------------------------------ |
| `pinned` | boolean | false    | false   | Whether this subspace is pinned in its parent's list |

**Modified JSONB** (`settings` column):

The `ISpaceSettings` JSONB gains a new top-level field:

| Field      | Type            | Default          | Description                                 |
| ---------- | --------------- | ---------------- | ------------------------------------------- |
| `sortMode` | SpaceSortMode   | `"alphabetical"` | How subspaces are ordered: alphabetical or custom |

### New Enum: `SpaceSortMode`

| Value          | DB String        | Description                                    |
| -------------- | ---------------- | ---------------------------------------------- |
| `ALPHABETICAL` | `"alphabetical"` | Subspaces sorted by name (A-Z); default        |
| `CUSTOM`       | `"custom"`       | Subspaces sorted by manual sort order           |

## Affected Interfaces

### `ISpaceSettings` (GraphQL ObjectType `SpaceSettings`)

```
Before:
  privacy: ISpaceSettingsPrivacy
  membership: ISpaceSettingsMembership
  collaboration: ISpaceSettingsCollaboration

After:
  privacy: ISpaceSettingsPrivacy
  membership: ISpaceSettingsMembership
  collaboration: ISpaceSettingsCollaboration
  sortMode: SpaceSortMode              # NEW
```

### `ISpace` (GraphQL ObjectType `Space`)

```
Existing fields (unchanged):
  sortOrder: Int!

New fields:
  pinned: Boolean!                     # NEW - default false
```

## Migration Strategy

### Migration: `AddPinnedAndSortModeToSpace`

1. **Add `pinned` column**:
   ```sql
   ALTER TABLE "space" ADD "pinned" boolean NOT NULL DEFAULT false
   ```

2. **Backfill `sortMode` in JSONB settings**:
   ```sql
   UPDATE "space"
   SET "settings" = jsonb_set("settings", '{sortMode}', '"alphabetical"')
   WHERE "settings" ->> 'sortMode' IS NULL
   ```

3. **Rollback**:
   ```sql
   ALTER TABLE "space" DROP COLUMN "pinned"
   UPDATE "space" SET "settings" = "settings" - 'sortMode'
   ```

## Validation Rules

- `sortMode`: Must be a valid `SpaceSortMode` enum value. Validated at DTO layer.
- `pinned`: Boolean, no additional validation needed.
- `pinned` is only meaningful for subspaces (spaces with a `parentSpace`), but no DB constraint enforces this. L0 spaces will have `pinned: false` by default and the field is simply unused.

## Relationships

No new relationships. The existing self-referential `Space ↔ Space` (parent/subspaces) relationship is unchanged. The `pinned` field is a property of the child space, managed by the parent space's admin.
