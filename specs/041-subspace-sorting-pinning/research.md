# Research: Subspace Sorting & Pinning API

**Branch**: `041-subspace-sorting-pinning` | **Date**: 2026-03-06

## Decision 1: Where to store `sortMode`

**Decision**: Add `sortMode` to the existing `ISpaceSettings` JSONB column as a top-level field.

**Rationale**: Space settings are already stored as JSONB on the `space` table (`settings` column). The existing pattern uses nested sub-objects (`privacy`, `membership`, `collaboration`), but `sortMode` is a single enum value. Adding it directly to `ISpaceSettings` is the simplest approach per constitution principle 10 (Simplicity). No new entity or table needed.

**Alternatives considered**:
- Separate `sorting` sub-object (e.g., `ISpaceSettingsSorting` with `mode` field): Over-engineered for a single field. Can be refactored later if more sorting settings emerge.
- New column on `space` table: Unnecessary since JSONB settings already exist for this purpose.
- Separate `SpaceSettings` entity/table: Would require a major refactor of the existing JSONB approach with no benefit.

## Decision 2: Where to store `pinned` boolean

**Decision**: Add `pinned` as a new boolean column on the `space` table (since subspaces ARE spaces via self-referential relationship).

**Rationale**: The `space` table already contains `sortOrder` (integer column). Adding `pinned` as a sibling column follows the same pattern. It's a simple, indexed boolean that enables efficient queries. Since `pinned` is a per-subspace property (not a setting of the parent), it belongs on the space entity itself, not in the parent's JSONB settings.

**Alternatives considered**:
- Store in parent's JSONB settings as an array of pinned IDs: Would require complex queries and lose referential integrity.
- Separate join table (`space_pinned`): Over-engineered for a boolean flag.
- Store in `sortOrder` field (negative values = pinned): Fragile and semantically confusing.

## Decision 3: Mutation design for pin/unpin

**Decision**: Single `updateSubspacePinned` mutation with `subspaceId` and `pinned: Boolean` inputs.

**Rationale**: A single mutation with a boolean parameter is inherently idempotent (FR-006), simpler than two separate mutations, and follows the existing `updateSpace` pattern of taking an input with the desired state. The client simply sets `pinned: true` or `pinned: false`.

**Alternatives considered**:
- Two separate mutations (`pinSubspace` / `unpinSubspace`): More surface area for the same functionality. Would still need idempotency handling.
- Include `pinned` in `updateSpace` input: Would conflate space self-update with parent-child management. The parent admin pins a child space, so authorization context differs.

## Decision 4: Mutation design for sortMode

**Decision**: Extend the existing `updateSpaceSettings` mutation to include `sortMode` as an optional field in `UpdateSpaceSettingsEntityInput`.

**Rationale**: `sortMode` is a space setting, and the existing `updateSpaceSettings` mutation already handles all settings changes. Adding `sortMode` to the existing input follows the established pattern exactly. No new mutation needed.

**Alternatives considered**:
- New dedicated `updateSpaceSortMode` mutation: Unnecessary proliferation of mutations when the settings update path already exists.

## Decision 5: Default value strategy for existing spaces

**Decision**: Use application-level default. The migration adds `sortMode` to the JSONB with value `"alphabetical"` for all existing spaces. New spaces get `"alphabetical"` via the creation defaults.

**Rationale**: All existing spaces should have the default baked into their JSONB to avoid null-checking at query time. The migration ensures data consistency. This aligns with FR-002 (default to Alphabetical for all spaces including existing ones).

**Alternatives considered**:
- Application-level null coalescing (treat null as Alphabetical): Would leave inconsistent data in the database and require defensive coding everywhere settings are read.

## Decision 6: Authorization privilege for pinning

**Decision**: Reuse `AuthorizationPrivilege.UPDATE` on the parent space's authorization policy.

**Rationale**: Pinning is a management action on the parent space's subspace ordering, similar to `updateSubspacesSortOrder` which already uses `UPDATE` privilege. Space admins who can reorder subspaces should also be able to pin them.

**Alternatives considered**:
- New `PIN_SUBSPACE` privilege: Over-engineered for what is essentially a subspace management action already covered by `UPDATE`.
- `UPDATE` on the subspace itself: Wrong scope - pinning is a parent-level operation (the parent decides which children are pinned).

## Decision 7: Schema change classification

**Decision**: All changes are ADDITIVE (non-breaking). New enum, new field on `Space`, new field on `SpaceSettings`, new optional input field, new mutation.

**Rationale**: No existing fields are removed or changed. The `updateSubspacesSortOrder` mutation continues to work unchanged. The `pinned` field defaults to `false`. The `sortMode` defaults to `Alphabetical`. Clients that don't use the new fields are unaffected.
