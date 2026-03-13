# Data Model: Callout Description Display Mode Setting

**Feature**: 043-callout-collapse
**Date**: 2026-03-11

## Entities

### CalloutDescriptionDisplayMode (Enum)

New enum registered as a GraphQL enum type.

| Value | Storage Value | Description |
| --- | --- | --- |
| COLLAPSED | `"collapsed"` | Callout descriptions render collapsed by default |
| EXPANDED | `"expanded"` | Callout descriptions render expanded by default |

**Location**: `src/common/enums/callout.description.display.mode.ts`

### SpaceSettingsLayout (Sub-object)

New settings sub-object nested within `ISpaceSettings`.

| Field | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| calloutDescriptionDisplayMode | CalloutDescriptionDisplayMode | Yes | COLLAPSED (new) / EXPANDED (existing) | Default display mode for callout descriptions in this space |

**Location**: `src/domain/space/space.settings/space.settings.layout.interface.ts`

### ISpaceSettings (Modified)

Existing settings interface extended with new `layout` field.

| Field | Type | Required | Change |
| --- | --- | --- | --- |
| privacy | ISpaceSettingsPrivacy | Yes | Unchanged |
| membership | ISpaceSettingsMembership | Yes | Unchanged |
| collaboration | ISpaceSettingsCollaboration | Yes | Unchanged |
| sortMode | SpaceSortMode | Yes | Unchanged |
| **layout** | **ISpaceSettingsLayout** | **Yes** | **NEW** |

## Storage

No schema changes to the `space` table. The `layout` sub-object is stored within the existing `settings` JSONB column.

### JSONB Structure (after migration)

```json
{
  "privacy": { "mode": "public", "allowPlatformSupportAsAdmin": false },
  "membership": { "policy": "open", "trustedOrganizations": [], "allowSubspaceAdminsToInviteMembers": false },
  "collaboration": { "allowMembersToCreateSubspaces": true, "..." : "..." },
  "sortMode": "alphabetical",
  "layout": {
    "calloutDescriptionDisplayMode": "expanded"
  }
}
```

## Migration

**Name**: `AddLayoutSettingsToSpace`
**Direction**: Additive (JSONB field addition)

### Up

```sql
UPDATE "space"
SET "settings" = jsonb_set("settings", '{layout}', '{"calloutDescriptionDisplayMode": "expanded"}')
WHERE "settings" ->> 'layout' IS NULL
```

- All existing spaces get `layout.calloutDescriptionDisplayMode = "expanded"` (preserving current behavior)
- Conditional: only spaces missing the `layout` key are updated

### Down

```sql
UPDATE "space"
SET "settings" = "settings" - 'layout'
WHERE "settings" ->> 'layout' IS NOT NULL
```

- Removes the `layout` key from JSONB settings
- Other settings fields are unaffected

## Validation Rules

- `calloutDescriptionDisplayMode`: Must be a valid `CalloutDescriptionDisplayMode` enum value (enforced by GraphQL enum type)
- No additional business validation required (no cross-field dependencies)

## Defaults

| Context | Default Value | Rationale |
| --- | --- | --- |
| New space (no template value) | `COLLAPSED` | New spaces benefit from compact layout |
| Existing space (migration) | `EXPANDED` | Preserves current behavior |
| Missing field (runtime fallback) | `EXPANDED` | Defensive default matching pre-feature behavior |
