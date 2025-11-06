# Data Model: Guest Contributions Privilege Management

**Feature**: 014-guest-contributions-privileges
**Date**: 2025-11-05
**Status**: Phase 1 Design

## Overview

This feature does NOT introduce new database tables or entities. It extends existing authorization behavior by adding a new privilege type and modifying how authorization rules are applied to whiteboards based on space settings.

**Architecture Pattern**: Uses **authorization reset cascade** - when space settings change or admin roles are modified, `applyAuthorizationPolicy()` is called on the space, which cascades through Collaboration → CalloutsSet → Callout → CalloutContribution → Whiteboard. During this cascade, `WhiteboardAuthorizationService.appendPrivilegeRules()` conditionally appends PUBLIC_SHARE privilege rules based on `spaceSettings.collaboration.allowGuestContributions`.

## Entities (Existing - Extended)

### AuthorizationPrivilege (Enum Extension)

**Location**: `src/common/enums/authorization.privilege.ts`

**Change**: Add new enum value

```typescript
export enum AuthorizationPrivilege {
  // ... existing values ...
  PUBLIC_SHARE = 'public-share', // ← NEW: Enable user to control guest access on a whiteboard
}
```

**Purpose**: Grants ability to toggle guest access for a specific whiteboard through Share dialog

**Scope**: Per-whiteboard, per-user

**Granted To**:

- Space admins (on all whiteboards in their space when `allowGuestContributions = true`)
- Whiteboard owners (on their own whiteboard when containing space has `allowGuestContributions = true`)

---

### Whiteboard (Entity - No Schema Change)

**Location**: `src/domain/common/whiteboard/whiteboard.entity.ts`

**Existing Fields Used**:

- `id: string` - Whiteboard unique identifier
- `createdBy: string` - User ID of whiteboard creator
- `authorization: IAuthorizationPolicy` - Authorization rules (modified at runtime)

**No Database Migration Required**: Authorization policy stored as JSON; privilege rules dynamically computed

---

### SpaceSettingsCollaboration (Entity - No Change)

**Location**: `src/domain/space/space.settings/space.settings.collaboration.interface.ts`

**Existing Field Used**:

- `allowGuestContributions: boolean` - Toggle for guest contribution policy (already exists from spec 013)

**Purpose**: When toggled, `SpaceService.shouldUpdateAuthorizationPolicy()` returns true, triggering `SpaceAuthorizationService.applyAuthorizationPolicy()` cascade which rebuilds all authorization rules including PUBLIC_SHARE privileges

---

### AuthorizationPolicy (Entity - Runtime Modification)

**Location**: `src/domain/common/authorization-policy/authorization.policy.entity.ts`

**Existing Structure**:

```typescript
{
  id: string;
  privilegeRules: IAuthorizationPolicyRulePrivilege[];  // ← Modified at runtime
  credentialRules: IAuthorizationPolicyRuleCredential[]; // ← Modified at runtime
  // ...
}
```

**Runtime Modifications**:

When `allowGuestContributions = true` for a space, during authorization reset cascade:

1. **For space admins**:

   ```typescript
   // Credential rule added to each whiteboard's authorization policy during appendCredentialRules()
   {
     grantedPrivileges: [AuthorizationPrivilege.PUBLIC_SHARE],
     criterias: [
       {
         type: AuthorizationCredential.SPACE_ADMIN,
         resourceID: space.id  // Directly binds the space admin credential to PUBLIC_SHARE
       }
     ],
     cascade: true,
     name: 'space-admin-public-share'
   }
   ```

2. **For whiteboard owner**:
   ```typescript
   // Credential rule added to whiteboard's authorization policy during appendCredentialRules()
   {
     grantedPrivileges: [AuthorizationPrivilege.PUBLIC_SHARE],
     criterias: [
       {
         type: AuthorizationCredential.USER_SELF_MANAGEMENT,
         resourceID: whiteboard.createdBy  // User ID of whiteboard creator
       }
     ],
     cascade: true,
     name: 'whiteboard-owner-public-share'
   }
   ```

**When `allowGuestContributions = false`**: `appendPrivilegeRules()` skips adding PUBLIC_SHARE rules, effectively revoking them during the reset.

---

## Relationships

### Space → Whiteboard (Indirect via Authorization Cascade)

```
Space.applyAuthorizationPolicy()
  └─ Collaboration.applyAuthorizationPolicy(spaceSettings)
      └─ CalloutsSet.applyAuthorizationPolicy(spaceSettings)
          └─ Callout.applyAuthorizationPolicy()
              └─ CalloutContribution.applyAuthorizationPolicy()
                  └─ Whiteboard.applyAuthorizationPolicy(parentAuthorization)
                      └─ appendPrivilegeRules() ← checks spaceSettings.allowGuestContributions
```

**Authorization Flow**: Space settings propagate through the cascade; each service passes them down to children

---

### Space → Community → RoleSet → User (Admin Privileges)

```
Space
  └─ Community
      └─ RoleSet
          └─ Admin privileges passed through authorization cascade
```

**Authorization Flow**: Admin privileges are inherited during cascade; `appendCredentialRules()` assigns PUBLIC_SHARE directly to the space-admin credential without relying on UPDATE privilege remapping.

---

## State Transitions

### Authorization Reset Lifecycle

```
┌─────────────────────────────────────────────────────────────┐
│ Setting: allowGuestContributions = FALSE (default)          │
│ State: appendPrivilegeRules() skips PUBLIC_SHARE            │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ Admin toggles setting ON
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ SpaceService.shouldUpdateAuthorizationPolicy() → true       │
│ SpaceAuthorizationService.applyAuthorizationPolicy()        │
│ Cascade to all whiteboards                                  │
│ appendPrivilegeRules() adds PUBLIC_SHARE rules              │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ Admin toggles setting OFF
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ SpaceService.shouldUpdateAuthorizationPolicy() → true       │
│ SpaceAuthorizationService.applyAuthorizationPolicy()        │
│ Cascade to all whiteboards                                  │
│ appendPrivilegeRules() skips PUBLIC_SHARE rules             │
│ State: Privileges removed during reset                      │
└─────────────────────────────────────────────────────────────┘
```

### New Admin Role Grant (when `allowGuestContributions = TRUE`)

- Assigning an admin role issues the standard space-admin credential.
- Because PUBLIC_SHARE is bound directly to that credential, new admins inherit PUBLIC_SHARE on all relevant whiteboards immediately.
- No additional authorization reset is triggered solely by adding an admin; the initial setting toggle already ensured every whiteboard policy carries the `space-admin-public-share` rule.

### New Whiteboard Creation (in space with `allowGuestContributions = TRUE`)

```
Whiteboard created in Space
         │
         ▼
WhiteboardService.createWhiteboard()
         │
         ▼
Parent authorization passed from CalloutContribution
         │
         ▼
WhiteboardAuthorizationService.applyAuthorizationPolicy(parentAuth)
         │
         ▼
appendCredentialRules() - adds owner PUBLIC_SHARE credential rule
appendPrivilegeRules() - adds admin PUBLIC_SHARE privilege rule if allowGuestContributions
         │
         ▼
Whiteboard created with PUBLIC_SHARE rules already applied
```

**Note**: New whiteboards inherit parent authorization and get rules applied immediately during creation, without needing a separate privilege grant operation.

---

## Validation Rules

### Privilege Assignment Constraints

| Rule                                                                              | Enforcement Point                            | Error Handling              |
| --------------------------------------------------------------------------------- | -------------------------------------------- | --------------------------- |
| Only space admins (not subspace admins) receive PUBLIC_SHARE on space whiteboards | SpaceSettings isolation during cascade       | N/A - enforced by design    |
| Whiteboard owner receives PUBLIC_SHARE only on their own whiteboard               | appendCredentialRules() resourceID check     | N/A - enforced by logic     |
| Privileges applied atomically (all or none)                                       | Transaction boundary in resolver             | Rollback entire cascade     |
| Setting reversion on failure                                                      | Transaction rollback in updateSpaceSettings  | Revert setting change       |
| Each space uses own settings (no inheritance)                                     | Each space passes its own spaceSettings down | N/A - no cross-space impact |

---

## Performance Considerations

### Authorization Reset Cascade

**Scenario**: Space with 1000 whiteboards, `allowGuestContributions` toggled ON

**Cascade Flow**:

1. `SpaceAuthorizationService.applyAuthorizationPolicy(spaceId)` called once
2. Cascades through entity hierarchy (Space → Collaboration → CalloutsSet → Callout → Contribution → Whiteboard)
3. Each whiteboard's `applyAuthorizationPolicy()` called with parent authorization + space settings
4. `appendPrivilegeRules()` adds PUBLIC_SHARE rules conditionally

**Optimization Strategy**:

- Batch save all authorization policies: `authorizationPolicyService.saveAll(updatedPolicies)`
- No explicit whiteboard queries needed - cascade traverses relationships
- Space settings passed as parameter through cascade (no repeated DB lookups)

**Expected Performance**: < 1 second for 1000 whiteboards (per SC-006)

**Database Operations**:

- 1 space authorization update
- N whiteboard authorization updates (batched)
- No explicit admin or whiteboard queries (leverages existing cascade)

---

## Migration Requirements

### No Database Migration Required

**Rationale**:

- `AuthorizationPrivilege` is a **TypeScript compile-time enum only**
- Not stored in database schema
- Authorization policies use JSON columns with dynamic rule structures
- No schema changes needed

**Validation Task (T002)**:

Simply verify the enum compiles and builds successfully:

```bash
pnpm build
```

**No Migration File Needed**: The original migration concept has been removed from the implementation plan.

---

## Data Integrity

### Consistency Guarantees

1. **Transactional Integrity**: Authorization cascade wrapped in transaction at resolver level (`SpaceResolverMutations.updateSpaceSettings`)
2. **Eventual Consistency**: N/A - operations are synchronous via authorization reset cascade
3. **Idempotency**: `applyAuthorizationPolicy()` rebuilds rules from scratch every time; safe to call repeatedly
4. **Cascade Deletion**: When whiteboard deleted, authorization policy auto-deleted (existing FK constraint)
5. **Settings Isolation**: Each space uses its own `spaceSettings` during cascade; no inheritance to subspaces
6. **Reset Pattern Safety**: Privileges never explicitly granted/revoked - always rebuilt statically during reset

---

## Summary

- **No new tables**: Extends existing `authorization_policy` JSON structure via authorization reset cascade
- **Enum extension**: Add `PUBLIC_SHARE` to `AuthorizationPrivilege` (TypeScript only, no DB change)
- **Authorization reset pattern**: Rules rebuilt from scratch during `applyAuthorizationPolicy()` cascade
- **Space settings propagation**: Settings flow through Collaboration → CalloutsSet → Callout → CalloutContribution → Whiteboard
- **Conditional rule creation**: `appendPrivilegeRules()` checks `allowGuestContributions` and conditionally adds PUBLIC_SHARE
- **Transactional safety**: Rollback on failure ensures consistency
- **Performance**: Leverages existing cascade infrastructure (1000 whiteboards in < 1 second)
- **No migration file**: Enum is compile-time only; validation via build process
