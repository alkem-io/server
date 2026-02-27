# Service Contracts: Guest Contributions Privilege Management

**Feature**: 023-guest-contributions-privileges
**Date**: 2025-11-05
**Type**: Internal Service Contracts

## Overview

This feature does NOT expose new public GraphQL APIs. All contracts are internal service methods extending existing authorization services.

**Architecture Pattern**: Uses **authorization reset cascade** - privileges are NOT explicitly granted/revoked but rather assigned statically during `applyAuthorizationPolicy()` cascade. When space settings change or admin roles are modified, the entire space authorization tree is rebuilt from scratch.

---

## Internal Service Contracts

### WhiteboardAuthorizationService Extensions

**Location**: `src/domain/common/whiteboard/whiteboard.service.authorization.ts`

#### Method: `appendCredentialRules()` - EXTENDED

**Purpose**: Add PUBLIC_SHARE credential rule for whiteboard owner when space has guest contributions enabled

**Signature**:

```typescript
/**
 * Extends authorization policy with credential-based rules.
 * EXTENDED to add PUBLIC_SHARE credential rule for whiteboard owner
 * when allowGuestContributions = true.
 *
 * @param authorization - Authorization policy to extend
 * @param whiteboard - Whiteboard entity with createdBy user ID
 * @param spaceSettings - Space settings (optional, contains allowGuestContributions)
 * @returns Authorization policy with added credential rules
 */
private appendCredentialRules(
  authorization: IAuthorizationPolicy,
  whiteboard: IWhiteboard,
  spaceSettings?: ISpaceSettings
): IAuthorizationPolicy;
```

**Behavior**:

- Called during `applyAuthorizationPolicy()` cascade
- If `spaceSettings?.collaboration.allowGuestContributions === true`:
  - Add credential rule: `{ grantedPrivileges: [AuthorizationPrivilege.PUBLIC_SHARE], criterias: [{ type: AuthorizationCredential.USER_SELF_MANAGEMENT, resourceID: whiteboard.createdBy }], cascade: true, name: 'whiteboard-owner-public-share' }`
- If `allowGuestContributions === false` or undefined: Skip PUBLIC_SHARE rule (no-op)
- Return modified authorization policy (caller saves via `authorizationPolicyService.saveAll()`)

**Transaction Scope**: Called within cascade; transaction managed at resolver level

---

#### Method: `appendPrivilegeRules()` - EXTENDED

**Purpose**: Add PUBLIC_SHARE privilege rules for space admins when space has guest contributions enabled

**Signature**:

```typescript
/**
 * Extends authorization policy with privilege-based rules.
 * EXTENDED to add PUBLIC_SHARE privilege rule for space admins
 * when allowGuestContributions = true.
 *
 * @param authorization - Authorization policy to extend
 * @param whiteboard - Whiteboard entity
 * @param spaceSettings - Space settings (optional, contains allowGuestContributions)
 * @returns Authorization policy with added privilege rules
 */
private appendPrivilegeRules(
  authorization: IAuthorizationPolicy,
  whiteboard: IWhiteboard,
  spaceSettings?: ISpaceSettings
): IAuthorizationPolicy;
```

**Behavior**:

- Called during `applyAuthorizationPolicy()` cascade
- If `spaceSettings?.collaboration.allowGuestContributions === true`:
  - Add privilege rule: `{ grantedPrivileges: [AuthorizationPrivilege.PUBLIC_SHARE], sourcePrivilege: AuthorizationPrivilege.UPDATE, name: 'space-admin-public-share' }`
  - This maps existing UPDATE privilege (held by space admins via parent authorization) to PUBLIC_SHARE
- If `allowGuestContributions === false` or undefined: Skip PUBLIC_SHARE rule (no-op)
- Return modified authorization policy (caller saves via `authorizationPolicyService.saveAll()`)

**Transaction Scope**: Called within cascade; transaction managed at resolver level

---

#### Method: `applyAuthorizationPolicy()` - SIGNATURE UPDATED

**Purpose**: Apply authorization policy to whiteboard (existing method, signature extended)

**Signature**:

```typescript
/**
 * Applies authorization policy to whiteboard.
 * UPDATED to accept spaceSettings parameter for privilege rule computation.
 *
 * @param whiteboard - Whiteboard entity
 * @param parentAuthorization - Parent authorization policy (from CalloutContribution)
 * @param spaceSettings - Space settings (optional, propagated through cascade)
 * @returns Updated whiteboard with authorization policy
 */
async applyAuthorizationPolicy(
  whiteboard: IWhiteboard,
  parentAuthorization?: IAuthorizationPolicy,
  spaceSettings?: ISpaceSettings
): Promise<IWhiteboard>;
```

**Behavior**:

- Existing cascade logic remains unchanged
- Passes `spaceSettings` to `appendCredentialRules()` and `appendPrivilegeRules()`
- Rebuilds authorization from scratch (reset pattern)

---

### CalloutContributionAuthorizationService Extensions

**Location**: `src/domain/collaboration/callout-contribution/callout.contribution.service.authorization.ts`

#### Method: `applyAuthorizationPolicy()` - SIGNATURE UPDATED

**Purpose**: Propagate space settings through cascade to Whiteboard

**Signature**:

```typescript
/**
 * Applies authorization policy to callout contribution.
 * UPDATED to accept and propagate spaceSettings parameter.
 *
 * @param contribution - CalloutContribution entity
 * @param parentAuthorization - Parent authorization policy (from Callout)
 * @param spaceSettings - Space settings (optional, propagated to children)
 * @returns Updated contribution with authorization policy
 */
async applyAuthorizationPolicy(
  contribution: ICalloutContribution,
  parentAuthorization?: IAuthorizationPolicy,
  spaceSettings?: ISpaceSettings
): Promise<ICalloutContribution>;
```

**Behavior**:

- Existing cascade logic remains unchanged
- Passes `spaceSettings` down to `whiteboardAuthService.applyAuthorizationPolicy()` when contribution contains whiteboard

---

### SpaceService Extensions

**Location**: `src/domain/space/space/space.service.ts`

#### Method: `shouldUpdateAuthorizationPolicy()` - EXISTING (VERIFICATION ONLY)

**Purpose**: Detect when authorization cascade should be triggered (already handles `allowGuestContributions` changes)

**Signature**:

```typescript
/**
 * Determines if authorization policy should be updated based on settings changes.
 * ALREADY HANDLES allowGuestContributions changes.
 *
 * @param spaceId - Space ID
 * @param newSettings - New space settings
 * @returns true if authorization should be recalculated
 */
async shouldUpdateAuthorizationPolicy(
  spaceId: string,
  newSettings: ISpaceSettings
): Promise<boolean>;
```

**Behavior**:

- Returns `true` when `allowGuestContributions` changes from previous value
- Triggers `SpaceResolverMutations.updateSpaceSettings()` to call `applyAuthorizationPolicy()` cascade
- No code changes needed (existing implementation already detects this setting change)

---

### RoleSetResolverMutations Extensions

**Location**: `src/domain/access/role-set/role.set.resolver.mutations.ts`

#### Method: `assignRoleToUser()` - EXTENDED

**Purpose**: Trigger space authorization reset when ADMIN role is assigned

**New Behavior**:

- After assigning role, check if `role === CommunityRole.ADMIN`
- If true, get parent Space from RoleSet and call `spaceAuthService.applyAuthorizationPolicy(space.id)`
- This ensures new admin immediately receives PUBLIC_SHARE privileges on all whiteboards (if setting enabled)

---

#### Method: `removeRoleFromUser()` - EXTENDED

**Purpose**: Trigger space authorization reset when ADMIN role is removed

**New Behavior**:

- After removing role, check if `role === CommunityRole.ADMIN`
- If true, get parent Space from RoleSet and call `spaceAuthService.applyAuthorizationPolicy(space.id)`
- This ensures removed admin immediately loses PUBLIC_SHARE privileges on all whiteboards

---

## Authorization Cascade Triggers

This feature does NOT use event-driven architecture. Instead, it leverages the existing **authorization reset cascade** pattern.

### Trigger 1: Space Settings Change

**Entry Point**: `SpaceResolverMutations.updateSpaceSettings()`

**Flow**:

1. User updates `allowGuestContributions` setting via GraphQL mutation
2. `SpaceService.shouldUpdateAuthorizationPolicy()` detects setting change
3. Returns `true`, triggering `SpaceAuthorizationService.applyAuthorizationPolicy(space.id)`
4. Cascade flows: Space → Collaboration → CalloutsSet → Callout → CalloutContribution → Whiteboard
5. `WhiteboardAuthorizationService.appendPrivilegeRules()` checks `spaceSettings.allowGuestContributions`
6. If `true`: Adds PUBLIC_SHARE rules; If `false`: Skips PUBLIC_SHARE rules (effectively revoking)
7. All modified authorization policies saved via `authorizationPolicyService.saveAll()`

**Transaction Boundary**: Entire mutation wrapped in resolver-level transaction

**Performance**: Cascade completes in < 1 second for 1000 whiteboards (leverages existing bulk save infrastructure)

---

### Trigger 2: Admin Role Assignment

**Entry Point**: `RoleSetResolverMutations.assignRoleToUser(role: ADMIN)`

**Flow**:

1. User granted ADMIN role on space community
2. Resolver checks if assigned role is `ADMIN`
3. If true, get parent Space from RoleSet
4. Trigger `SpaceAuthorizationService.applyAuthorizationPolicy(space.id)`
5. Cascade rebuilds authorization for entire space tree
6. New admin's UPDATE privilege (inherited from space) maps to PUBLIC_SHARE via `appendPrivilegeRules()`

**Transaction Boundary**: Role assignment + authorization reset in single transaction

---

### Trigger 3: Admin Role Removal

**Entry Point**: `RoleSetResolverMutations.removeRoleFromUser(role: ADMIN)`

**Flow**:

1. User's ADMIN role removed from space community
2. Resolver checks if removed role is `ADMIN`
3. If true, get parent Space from RoleSet
4. Trigger `SpaceAuthorizationService.applyAuthorizationPolicy(space.id)`
5. Cascade rebuilds authorization; ex-admin no longer has UPDATE privilege to map to PUBLIC_SHARE

**Transaction Boundary**: Role removal + authorization reset in single transaction

---

### Trigger 4: New Whiteboard Creation

**Entry Point**: Whiteboard creation (any method)

**Flow**:

1. Whiteboard created in space with `allowGuestContributions = true`
2. Parent authorization policy already contains space settings
3. `WhiteboardAuthorizationService.applyAuthorizationPolicy()` called with inherited parent auth + settings
4. `appendCredentialRules()` adds owner PUBLIC_SHARE rule
5. `appendPrivilegeRules()` adds admin PUBLIC_SHARE rule
6. Authorization saved with whiteboard creation

**Transaction Boundary**: Whiteboard creation + authorization in single transaction

---

## CommunityService Extensions

**Location**: `src/domain/community/community/community.service.ts`

### Method: `getAdmins()` - NEW

**Purpose**: Retrieve all admin user IDs for a space community

**Signature**:

```typescript
/**
 * Finds all users with 'admin' role in a space community.
 * Used during authorization reset to determine who receives PUBLIC_SHARE privileges.
 *
 * @param communityId - Community ID (from space.communityId)
 * @returns Array of user IDs with admin role
 */
async getAdmins(communityId: string): Promise<string[]>;
```

**Behavior**:

- Query `Community.roleSet` for users with role = 'admin'
- Return array of user IDs
- Called by `appendPrivilegeRules()` to map admin UPDATE privilege to PUBLIC_SHARE

**Performance**: Indexed query on `communityId` + `role`

---

## RoleSetService Extensions

**Location**: `src/domain/access/role-set/role.set.service.ts`

### Method: `getSpaceFromRoleSet()` - NEW

**Purpose**: Helper to get parent Space from RoleSet (needed for admin role change triggers)

**Signature**:

```typescript
/**
 * Finds the parent Space for a RoleSet.
 * Used when admin role changes to determine which space needs authorization reset.
 *
 * @param roleSetId - RoleSet ID
 * @returns Parent Space entity
 * @throws EntityNotFoundException if RoleSet has no parent Space
 */
async getSpaceFromRoleSet(roleSetId: string): Promise<ISpace>;
```

**Behavior**:

- Query RoleSet → Community → Space relationship
- Return Space entity
- Called by `assignRoleToUser()` and `removeRoleFromUser()` when role is ADMIN

---

## Validation Contracts

### Input Validation

**N/A** - No new GraphQL inputs (existing setting toggle uses `SpaceSettingsInput`)

---

### Business Rule Validation

#### Rule: Space-Level Admins Only

**Enforced By**: `CommunityService.getAdmins()`

**Logic**: Query filters by community ID associated with space (not subspace communities)

**Result**: Subspace admins do NOT receive PUBLIC_SHARE on parent space whiteboards

---

#### Rule: Owner Match

**Enforced By**: `WhiteboardAuthorizationService.appendCredentialRules()`

**Logic**: Credential rule matches `whiteboard.createdBy === userId`

**Result**: Only whiteboard creator receives owner PUBLIC_SHARE privilege

---

#### Rule: Settings Isolation (No Inheritance)

**Enforced By**: Authorization cascade architecture

**Logic**: Each space uses its own `spaceSettings` during `applyAuthorizationPolicy()`; subspaces do NOT inherit parent settings

**Result**: Parent space with `allowGuestContributions = true` does NOT affect subspace whiteboards unless subspace also has setting enabled

---

## Error Contracts

### Error Codes (Internal)

No new GraphQL error codes exposed. Internal errors use standard NestJS exceptions:

| Exception                      | Trigger Condition                            | HTTP Status |
| ------------------------------ | -------------------------------------------- | ----------- |
| `InternalServerErrorException` | Space admin lookup fails                     | 500         |
| `EntityNotFoundException`      | Whiteboard or authorization policy not found | 404         |
| `TransactionRollbackException` | Authorization cascade fails during mutation  | 500         |

---

## Testing Contracts

### Integration Test Expectations

**File**: `test/functional/integration/whiteboard-authorization.it.spec.ts`

**Scenarios**:

1. **Toggle ON**: Enabling `allowGuestContributions` triggers authorization cascade; verify admins + owners have PUBLIC_SHARE on all whiteboards
2. **Toggle OFF**: Disabling `allowGuestContributions` triggers authorization cascade; verify PUBLIC_SHARE rules NOT present (omitted during reset)
3. **New Admin**: Granting ADMIN role triggers space authorization reset; verify new admin receives PUBLIC_SHARE on all whiteboards (if setting enabled)
4. **Remove Admin**: Removing ADMIN role triggers space authorization reset; verify ex-admin loses PUBLIC_SHARE on all whiteboards
5. **New Whiteboard**: Creating whiteboard in enabled space automatically applies PUBLIC_SHARE rules during creation
6. **Transaction Rollback**: If authorization cascade fails, verify setting change is reverted and authorization remains unchanged
7. **Transaction Rollback**: If authorization cascade fails, verify setting change is reverted and authorization remains unchanged

---

### Unit Test Expectations

**File**: `src/domain/common/whiteboard/whiteboard.service.authorization.spec.ts`

**Mocked Dependencies**:

- `CommunityService.getAdmins()` → returns mock admin IDs
- `AuthorizationPolicyService.saveAll()` → returns saved policies
- Parent authorization policy (mocked with UPDATE privilege for admins)

**Test Cases**:

- `appendCredentialRules()` adds owner PUBLIC_SHARE rule when `allowGuestContributions = true`
- `appendCredentialRules()` skips PUBLIC_SHARE rule when `allowGuestContributions = false`
- `appendPrivilegeRules()` adds admin PUBLIC_SHARE rule when `allowGuestContributions = true`
- `appendPrivilegeRules()` skips PUBLIC_SHARE rule when `allowGuestContributions = false`
- `applyAuthorizationPolicy()` passes `spaceSettings` to helper methods correctly
- Settings isolation: Subspace settings do NOT affect parent/sibling whiteboards

---

## Performance Contracts

### Response Time Constraints

| Operation                                      | Target     | Measurement Point                     |
| ---------------------------------------------- | ---------- | ------------------------------------- |
| Authorization cascade (1000 whiteboards)       | < 1 second | End-to-end mutation time              |
| Single whiteboard authorization reset          | < 100ms    | `applyAuthorizationPolicy()` duration |
| Admin role change + cascade (1000 whiteboards) | < 1 second | End-to-end role assignment time       |

**Monitoring**: Elastic APM traces with span names:

- `space.applyAuthorizationPolicy` (cascade entry point)
- `whiteboard.applyAuthorizationPolicy` (per-whiteboard)
- `whiteboard.appendPrivilegeRules` (privilege computation)

---

## Summary

- **No public API changes**: All contracts are internal service methods extending existing authorization cascade
- **Authorization reset pattern**: Privileges assigned statically during cascade; NOT explicitly granted/revoked
- **Cascade triggers**: Space settings change, admin role assignment/removal, whiteboard creation
- **Transactional safety**: Authorization cascade wrapped in resolver-level transaction
- **Service extensions**: `appendCredentialRules()`, `appendPrivilegeRules()`, `applyAuthorizationPolicy()` signature updates
- **Helper methods**: `CommunityService.getAdmins()`, `RoleSetService.getSpaceFromRoleSet()`
- **Testing expectations**: Integration tests verify cascade triggers; unit tests verify conditional rule logic
