# Implementation Plan: Guest Contributions Policy for Spaces

**Branch**: `server-8727` | **Date**: 2025-10-31 | **Spec**: [link](./spec.md)
**Input**: Feature specification from `/specs/022-guest-contributions-policy/spec.md`

## Summary

Add a new `allowGuestContributions` boolean setting to `SpaceSettingsCollaboration` following the exact same pattern as `allowMembersToVideoCall`. This is a straightforward addition to the existing collaboration settings structure with default value `false` for all spaces.

## Technical Context

The implementation follows the established pattern used for `allowMembersToVideoCall` (migration `1759156590119`):

1. **Interface Updates**: Add field to `ISpaceSettingsCollaboration`
2. **DTO Updates**: Add field to both `CreateSpaceSettingsCollaborationInput` and `UpdateSpaceSettingsCollaborationInput`
3. **Migration**: Use `JSON_SET` to add the field to existing spaces and template content spaces
4. **Defaults**: Update default settings in space templates and bootstrap definitions

**Key Files Pattern**:

- Interface: `src/domain/space/space.settings/space.settings.collaboration.interface.ts`
- DTOs: `src/domain/space/space.settings/dto/space.settings.collaboration.dto.{create,update}.ts`
- Migration: `src/migrations/{timestamp}-addSettingAllowGuestContributions.ts`
- Templates: Various files in `src/core/bootstrap/platform-template-definitions/`

## Constitution Check

✅ **Domain-Centric Design**: Change is within existing `SpaceSettingsCollaboration` domain model
✅ **Modular Boundaries**: No new modules; extends existing space settings module
✅ **GraphQL Schema Contract**: Additive change (new optional field)
✅ **Data Flow**: Follows existing space settings update pattern
✅ **Observability**: No special observability needs (uses existing space settings logging)
✅ **Testing**: No additional testing required (follows existing pattern)
✅ **API Consistency**: Follows same naming pattern as other `allow*` settings
✅ **Integration**: No external service integration required
✅ **Deployment**: Database migration required but non-breaking
✅ **Simplicity**: Minimal viable implementation following established patterns

**No violations** - implementation aligns perfectly with existing patterns.

## Project Structure

```
src/domain/space/space.settings/
├── space.settings.collaboration.interface.ts           # Add allowGuestContributions field
├── dto/
│   ├── space.settings.collaboration.dto.create.ts     # Add allowGuestContributions field
│   └── space.settings.collaboration.dto.update.ts     # Add allowGuestContributions field
src/migrations/
└── {timestamp}-addSettingAllowGuestContributions.ts    # New migration (mirrors 1759156590119)
src/core/bootstrap/platform-template-definitions/default-templates/
├── bootstrap.template.space.content.*.ts              # Update all template defaults
```

## Implementation Tasks

### Task 1: Update Domain Interface

**File**: `src/domain/space/space.settings/space.settings.collaboration.interface.ts`
**Action**: Add `allowGuestContributions!: boolean;` field with GraphQL decoration

### Task 2: Update Create DTO

**File**: `src/domain/space/space.settings/dto/space.settings.collaboration.dto.create.ts`
**Action**: Add `allowGuestContributions!: boolean;` field with appropriate Field decorator

### Task 3: Update Update DTO

**File**: `src/domain/space/space.settings/dto/space.settings.collaboration.dto.update.ts`
**Action**: Add `allowGuestContributions!: boolean;` field with appropriate Field decorator

### Task 4: Create Migration

**File**: `src/migrations/{timestamp}-addSettingAllowGuestContributions.ts`
**Action**: Copy pattern from `1759156590119-addSettingAllowMembersToVideoCall.ts`, set default to `false`

### Task 5: Update Template Defaults

**Files**: All files in `src/core/bootstrap/platform-template-definitions/default-templates/`
**Action**: Add `allowGuestContributions: false` to collaboration settings in all templates

### Task 6: Generate Schema

**Action**: Run `pnpm run schema:print` and `pnpm run schema:sort` to update GraphQL schema

## Risk Assessment

**LOW RISK** - This is an additive change following a proven pattern:

- ✅ **Breaking Changes**: None (additive GraphQL field)
- ✅ **Data Migration**: Simple JSON field addition with safe default
- ✅ **Backward Compatibility**: Fully maintained
- ✅ **Performance**: No impact (in-memory JSON field)
- ✅ **Rollback**: Migration includes down() method for safe rollback

## Success Criteria

1. **Field Addition**: `allowGuestContributions` boolean field available in GraphQL schema
2. **Default Behavior**: All new spaces default to `false` (disabled)
3. **Migration Success**: All existing spaces receive `allowGuestContributions: false`
4. **Admin Control**: Space admins can toggle the setting via existing space settings UI/API
5. **Schema Compliance**: No breaking changes to GraphQL contract

## Validation Steps

1. Run migration on test database
2. Verify field appears in GraphQL schema
3. Test space creation with default value
4. Test space settings update mutation
5. Verify template spaces have correct default

**Estimated Effort**: 2-4 hours (following established pattern exactly)
**Dependencies**: None (purely additive)
**Deployment**: Database migration required during deployment window
