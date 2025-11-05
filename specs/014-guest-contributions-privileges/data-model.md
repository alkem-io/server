# Data Model: Guest Contributions Privilege Management

**Feature**: 014-guest-contributions-privileges
**Date**: 2025-11-05
**Status**: Phase 1 Design

## Overview

This feature does NOT introduce new database tables or entities. It extends existing authorization behavior by adding a new privilege type and modifying how authorization rules are applied to whiteboards based on space settings.

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

**Purpose**: When toggled, triggers privilege grant/revoke operations on all whiteboards in the space

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

When `allowGuestContributions = true` for a space:

1. **For space admins**:

   ```typescript
   // Privilege rule added to each whiteboard's authorization policy
   {
     grantedPrivileges: [AuthorizationPrivilege.PUBLIC_SHARE],
     sourcePrivilege: AuthorizationPrivilege.UPDATE,  // Inherited from parent space admin privilege
     name: 'space-admin-public-share'
   }
   ```

2. **For whiteboard owner**:
   ```typescript
   // Credential rule added to whiteboard's authorization policy
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

---

## Relationships

### Space → Whiteboard (Indirect)

```
Space
  └─ Collaboration
      └─ Callout[]
          └─ CalloutContribution[]
              └─ Whiteboard
```

**Query Path**: Used to find all whiteboards within a space when applying privilege updates

---

### Space → Community → RoleSet → User (Admin Discovery)

```
Space
  └─ Community
      └─ RoleSet
          └─ ContributorRoles[] (where role = 'admin')
              └─ User
```

**Query Path**: Used to identify all space admins who should receive PUBLIC_SHARE privilege

---

## State Transitions

### Privilege Lifecycle

```
┌─────────────────────────────────────────────────────────────┐
│ Setting: allowGuestContributions = FALSE (default)          │
│ State: No PUBLIC_SHARE privileges granted                   │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ Admin toggles setting ON
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ Setting: allowGuestContributions = TRUE                     │
│ Action: Grant PUBLIC_SHARE to all space admins + owners     │
│ State: Privileges active                                    │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ Admin toggles setting OFF
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ Setting: allowGuestContributions = FALSE                    │
│ Action: Revoke all PUBLIC_SHARE privileges                  │
│ State: No PUBLIC_SHARE privileges granted                   │
└─────────────────────────────────────────────────────────────┘
```

### New Admin Role Grant (when `allowGuestContributions = TRUE`)

```
User granted admin role on Space
         │
         ▼
Event: AdminRoleGranted { userId, spaceId }
         │
         ▼
Handler: GrantPublicShareToNewAdmin
         │
         ▼
Query all whiteboards in space
         │
         ▼
Apply PUBLIC_SHARE privilege rules to each whiteboard
         │
         ▼
User now has PUBLIC_SHARE on all whiteboards
```

### New Whiteboard Creation (in space with `allowGuestContributions = TRUE`)

```
Whiteboard created in Space
         │
         ▼
WhiteboardService.createWhiteboard()
         │
         ▼
Check: space.settings.collaboration.allowGuestContributions
         │
         ├─ TRUE → Apply PUBLIC_SHARE rules (admin + owner)
         │
         └─ FALSE → Standard authorization (no PUBLIC_SHARE)
```

---

## Validation Rules

### Privilege Assignment Constraints

| Rule                                                                              | Enforcement Point     | Error Handling                                |
| --------------------------------------------------------------------------------- | --------------------- | --------------------------------------------- |
| Only space admins (not subspace admins) receive PUBLIC_SHARE on space whiteboards | Authorization service | N/A - enforced by query scope                 |
| Whiteboard owner receives PUBLIC_SHARE only on their own whiteboard               | Authorization service | N/A - enforced by `createdBy` match           |
| Privileges applied atomically (all or none)                                       | Transaction boundary  | Rollback on partial failure                   |
| Setting reversion on failure                                                      | Transaction boundary  | Rollback `allowGuestContributions` to `false` |

---

## Performance Considerations

### Bulk Operations

**Scenario**: Space with 1000 whiteboards, `allowGuestContributions` toggled ON

**Query Optimization**:

1. Fetch all whiteboards in one query:

   ```typescript
   SELECT id, createdBy, authorizationId
   FROM whiteboard
   WHERE /* space relationship filter */
   ```

2. Fetch space admins in one query:

   ```typescript
   SELECT userId
   FROM community_contributor_roles
   WHERE communityId = ? AND role = 'admin'
   ```

3. Batch authorization policy updates:
   ```typescript
   await authorizationPolicyService.saveAll(updatedPolicies);
   ```

**Expected Performance**: < 1 second for 1000 whiteboards (per SC-006)

---

## Migration Requirements

### Migration: Add PUBLIC_SHARE Enum Value

**File**: `src/migrations/NNNNNNNNNN-addPublicSharePrivilege.ts`

**Purpose**: No database schema change required—enum is TypeScript-only. Migration validates that existing authorization policies don't contain PUBLIC_SHARE privilege (defensive check).

**Migration Logic**:

```typescript
public async up(queryRunner: QueryRunner): Promise<void> {
  // Validation: Ensure no authorization policies already have 'public-share' in privilegeRules
  const existing = await queryRunner.query(`
    SELECT id FROM authorization_policy
    WHERE JSON_SEARCH(privilegeRules, 'one', 'public-share') IS NOT NULL
  `);

  if (existing.length > 0) {
    throw new Error('PUBLIC_SHARE privilege already exists in authorization policies');
  }

  // No schema changes needed
}

public async down(queryRunner: QueryRunner): Promise<void> {
  // Remove any PUBLIC_SHARE privileges that may have been granted
  await queryRunner.query(`
    UPDATE authorization_policy
    SET privilegeRules = JSON_REMOVE(
      privilegeRules,
      JSON_UNQUOTE(JSON_SEARCH(privilegeRules, 'all', 'public-share'))
    )
    WHERE JSON_SEARCH(privilegeRules, 'one', 'public-share') IS NOT NULL
  `);
}
```

---

## Data Integrity

### Consistency Guarantees

1. **Transactional Integrity**: All privilege updates wrapped in database transaction
2. **Eventual Consistency**: N/A - operations are synchronous
3. **Idempotency**: `applyAuthorizationPolicy()` rebuilds rules from scratch; safe to call multiple times
4. **Cascade Deletion**: When whiteboard deleted, authorization policy auto-deleted (existing FK constraint)

---

## Summary

- **No new tables**: Extends existing `authorization_policy` JSON structure
- **Enum extension**: Add `PUBLIC_SHARE` to `AuthorizationPrivilege`
- **Runtime privilege modification**: Authorization rules computed based on `allowGuestContributions` setting
- **Transactional safety**: Rollback on failure ensures consistency
- **Performance**: Optimized for bulk operations (1000 whiteboards in < 1 second)
