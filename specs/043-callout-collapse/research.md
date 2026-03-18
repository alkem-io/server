# Research: Callout Description Display Mode Setting

**Feature**: 043-callout-collapse
**Date**: 2026-03-11

## R1: Settings Sub-Object Pattern

**Decision**: Follow the existing `privacy`/`membership`/`collaboration` sub-object pattern for the new `layout` sub-object.

**Rationale**: The codebase has a well-established pattern for settings sub-objects:
- Abstract class with `@ObjectType` decorator for the GraphQL type
- Separate create/update `@InputType` DTOs with nullable fields
- Field-by-field or full-replacement merge in `SpaceSettingsService.updateSettings()`
- Registered in the main `ISpaceSettings` interface and both create/update DTOs

**Alternatives considered**:
- Top-level field on `ISpaceSettings` (like `sortMode`): Rejected because the user explicitly requested a `layout` namespace for future extensibility
- Separate database column: Rejected; JSONB is already used for all settings and supports nested objects natively

## R2: Enum Definition Pattern

**Decision**: Define `CalloutDescriptionDisplayMode` enum in `src/common/enums/` with lowercase string values and `registerEnumType()`.

**Rationale**: Matches existing enums like `SpaceSortMode` and `SpacePrivacyMode`:
```typescript
export enum CalloutDescriptionDisplayMode {
  COLLAPSED = 'collapsed',
  EXPANDED = 'expanded',
}
registerEnumType(CalloutDescriptionDisplayMode, {
  name: 'CalloutDescriptionDisplayMode',
});
```

**Alternatives considered**: None — pattern is consistent across all space-related enums.

## R3: Migration Strategy

**Decision**: Use `jsonb_set()` to add `layout` object with `calloutDescriptionDisplayMode` to existing spaces. Existing spaces get `EXPANDED`, preserving current behavior.

**Rationale**: The feature 041 migration (`AddPinnedAndSortModeToSpace`) established the pattern:
```sql
UPDATE "space"
SET "settings" = jsonb_set("settings", '{layout}', '{"calloutDescriptionDisplayMode": "expanded"}')
WHERE "settings" ->> 'layout' IS NULL
```

**Alternatives considered**:
- Application-level default only (no migration): Rejected because the spec requires a defensive default AND explicit backfill for data consistency
- Full settings rewrite migration: Rejected; `jsonb_set` is targeted and safe

## R4: Field Resolver Public Access

**Decision**: Add a `layout` field resolver on Space WITHOUT READ privilege guard, following the `sortMode` pattern.

**Rationale**: The spec clarification states layout settings are public metadata needed for rendering before full space data loads. The `sortMode` resolver already demonstrates this pattern — it resolves without `@AuthorizationActorHasPrivilege(AuthorizationPrivilege.READ)` and lazy-loads the space if settings aren't available.

**Alternatives considered**:
- READ-guarded only (via `settings` resolver): Rejected; client needs display mode before authenticated space load

## R5: Update Merge Strategy for Layout

**Decision**: Use full-replacement merge for the `layout` sub-object (like `membership`/`collaboration`), not field-by-field (like `privacy`).

**Rationale**: The `layout` sub-object currently has only one field (`calloutDescriptionDisplayMode`). Full replacement is simpler and sufficient. If future layout fields require partial updates, the merge strategy can be refined then (per Principle 10: Simplicity).

**Alternatives considered**:
- Field-by-field merge (like `privacy`): Unnecessary complexity for a single-field sub-object; can be added later when layout grows

## R6: Default Value for New Spaces

**Decision**: Set `layout.calloutDescriptionDisplayMode = COLLAPSED` during space creation, after template settings are applied.

**Rationale**: Follows the same pattern as `sortMode` default in `space.service.ts`:
```typescript
if (!space.settings.layout?.calloutDescriptionDisplayMode) {
  space.settings.layout = {
    ...space.settings.layout,
    calloutDescriptionDisplayMode: CalloutDescriptionDisplayMode.COLLAPSED,
  };
}
```

**Alternatives considered**: None — matches the established default-after-template pattern.
