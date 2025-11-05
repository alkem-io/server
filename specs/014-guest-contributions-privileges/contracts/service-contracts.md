# Service Contracts: Guest Contributions Privilege Management

**Feature**: 014-guest-contributions-privileges
**Date**: 2025-11-05
**Type**: Internal Service Contracts

## Overview

This feature does NOT expose new public GraphQL APIs. All contracts are internal service methods extending existing authorization and collaboration services.

---

## Internal Service Contracts

### WhiteboardAuthorizationService Extensions

**Location**: `src/services/api/whiteboard/whiteboard.service.authorization.ts`

#### Method: `applyGuestContributionPrivileges()`

**Purpose**: Apply PUBLIC_SHARE privilege rules when whiteboard is in a space with guest contributions enabled

**Signature**:

```typescript
/**
 * Extends authorization policy with PUBLIC_SHARE privilege when
 * the containing space has allowGuestContributions = true.
 *
 * Grants PUBLIC_SHARE to:
 * - All space admins (not subspace admins)
 * - Whiteboard owner (createdBy user)
 *
 * @param whiteboard - Whiteboard entity with loaded authorization policy
 * @param spaceId - ID of containing space (not subspace)
 * @param allowGuestContributions - Space setting value
 * @returns Updated whiteboard with modified authorization policy
 * @throws InternalServerErrorException if space admin lookup fails
 */
async applyGuestContributionPrivileges(
  whiteboard: IWhiteboard,
  spaceId: string,
  allowGuestContributions: boolean
): Promise<IWhiteboard>;
```

**Behavior**:

- If `allowGuestContributions = false`, returns whiteboard unchanged
- If `allowGuestContributions = true`:
  1. Query space admins via `communityService.getAdmins(spaceId)`
  2. Add privilege rule for each admin: `{ grantedPrivileges: ['public-share'], sourcePrivilege: 'update', name: 'space-admin-public-share' }`
  3. Add credential rule for owner: `{ grantedPrivileges: ['public-share'], resourceID: whiteboard.createdBy, type: 'user-self-management', name: 'whiteboard-owner-public-share' }`
  4. Save authorization policy
  5. Return updated whiteboard

**Error Handling**:

- Throws `InternalServerErrorException` if space admin query fails
- Throws `EntityNotFoundException` if whiteboard.authorization is null

**Transaction Scope**: Must be called within transaction boundary

---

### SpaceService Extensions

**Location**: `src/domain/space/space/space.service.ts`

#### Method: `updateGuestContributionPrivileges()`

**Purpose**: Bulk apply/revoke PUBLIC_SHARE privileges across all whiteboards when setting changes

**Signature**:

```typescript
/**
 * Updates PUBLIC_SHARE privileges on all whiteboards when allowGuestContributions setting changes.
 *
 * Operations:
 * - When enabled (false → true): Grant PUBLIC_SHARE to admins + owners on all whiteboards
 * - When disabled (true → false): Revoke all PUBLIC_SHARE privileges from all whiteboards
 *
 * @param spaceId - Space ID (not subspace)
 * @param allowGuestContributions - New setting value
 * @param entityManager - Transaction manager for atomic operation
 * @returns { updated: number; failed: string[] } - Count of updated whiteboards and failed IDs
 * @throws TransactionRollbackException if batch operation fails
 */
async updateGuestContributionPrivileges(
  spaceId: string,
  allowGuestContributions: boolean,
  entityManager: EntityManager
): Promise<{ updated: number; failed: string[] }>;
```

**Behavior**:

- Query all whiteboards in space (via callout → contribution → whiteboard path)
- For each whiteboard:
  - If `allowGuestContributions = true`: Call `whiteboardAuthService.applyGuestContributionPrivileges()`
  - If `allowGuestContributions = false`: Call `authorizationService.revokePrivilege(PUBLIC_SHARE)`
- Batch save all authorization policies
- Log success/failure count

**Performance Constraints**:

- Must complete within 1 second for 1000 whiteboards (SC-006)
- Uses bulk query + batch save to minimize round trips

**Error Handling**:

- Partial failures tracked in `failed` array
- If any whiteboard fails, entire transaction rolls back
- Logs error details per whiteboard

**Transaction Scope**: REQUIRED - must receive EntityManager from caller

---

### AuthorizationService Extensions

**Location**: `src/domain/common/authorization-policy/authorization.policy.service.ts`

#### Method: `revokePrivilege()`

**Purpose**: Remove specific privilege from authorization policy

**Signature**:

```typescript
/**
 * Removes all rules granting specified privilege from an authorization policy.
 *
 * @param authorizationPolicy - Policy to modify
 * @param privilege - Privilege to revoke (e.g., PUBLIC_SHARE)
 * @returns Updated authorization policy
 */
revokePrivilege(
  authorizationPolicy: IAuthorizationPolicy,
  privilege: AuthorizationPrivilege
): IAuthorizationPolicy;
```

**Behavior**:

- Filter `privilegeRules` to remove entries with `grantedPrivileges` containing target privilege
- Filter `credentialRules` to remove entries with `grantedPrivileges` containing target privilege
- Return modified policy (caller responsible for persistence)

**Idempotency**: Safe to call multiple times; no-op if privilege not present

---

## Event Contracts

### Event: `SpaceSettingsUpdated`

**Emitted By**: `SpaceService.updateSettings()`

**Payload**:

```typescript
{
  spaceId: string;
  settings: {
    collaboration: {
      allowGuestContributions: boolean; // ← Trigger field
    }
  }
  previousSettings: {
    collaboration: {
      allowGuestContributions: boolean;
    }
  }
}
```

**Subscribers**:

- `GuestContributionPrivilegeHandler` (new) - Applies/revokes PUBLIC_SHARE privileges

**Trigger Condition**: `allowGuestContributions` value changed (uses dirty tracking)

---

### Event: `AdminRoleGranted`

**Emitted By**: `CommunityService.grantRole()`

**Payload**:

```typescript
{
  userId: string;
  spaceId: string; // Community parent space ID
  role: CommunityRole; // = 'admin'
}
```

**Subscribers**:

- `GuestContributionPrivilegeHandler.onAdminRoleGranted()` - Grants PUBLIC_SHARE if setting enabled

**Trigger Condition**: Role = 'admin' AND space has `allowGuestContributions = true`

---

### Event: `WhiteboardCreated`

**Emitted By**: `WhiteboardService.createWhiteboard()`

**Payload**:

```typescript
{
  whiteboardId: string;
  createdBy: string; // Owner user ID
  spaceId: string; // Containing space ID
}
```

**Subscribers**:

- `WhiteboardAuthorizationService.onWhiteboardCreated()` - Applies guest contribution privileges if enabled

**Trigger Condition**: Always fires; handler checks `allowGuestContributions` setting internally

---

## Repository Contracts

### CommunityRepository Extensions

**Location**: `src/domain/community/community/community.repository.ts`

#### Method: `getAdmins()`

**Purpose**: Retrieve all admin users for a space community

**Signature**:

```typescript
/**
 * Finds all users with 'admin' role in a space community.
 *
 * @param communityId - Community ID (from space.communityId)
 * @returns Array of user IDs with admin role
 */
async getAdmins(communityId: string): Promise<string[]>;
```

**Query**:

```sql
SELECT user_id
FROM community_contributor_roles
WHERE community_id = ? AND role = 'admin'
```

---

### WhiteboardRepository Extensions

**Location**: `src/domain/common/whiteboard/whiteboard.repository.ts`

#### Method: `findAllInSpace()`

**Purpose**: Retrieve all whiteboards within a space (including nested callouts)

**Signature**:

```typescript
/**
 * Finds all whiteboards in a space, loading authorization policies.
 *
 * @param spaceId - Space ID (not subspace)
 * @returns Array of whiteboards with loaded authorization policies
 */
async findAllInSpace(spaceId: string): Promise<IWhiteboard[]>;
```

**Query Path**:

```sql
SELECT w.*
FROM whiteboard w
JOIN callout_contribution cc ON cc.whiteboard_id = w.id
JOIN callout c ON c.id = cc.callout_id
JOIN collaboration collab ON collab.id = c.collaboration_id
JOIN space s ON s.collaboration_id = collab.id
WHERE s.id = ?
```

**Relations Loaded**: `['authorization', 'authorization.privilegeRules', 'authorization.credentialRules']`

---

## Validation Contracts

### Input Validation

**N/A** - No new GraphQL inputs (existing setting toggle uses `SpaceSettingsInput`)

---

### Business Rule Validation

#### Rule: Space-Level Admins Only

**Enforced By**: `CommunityRepository.getAdmins()`

**Logic**: Query filters by community ID associated with space (not subspace communities)

---

#### Rule: Owner Match

**Enforced By**: `WhiteboardAuthorizationService.applyGuestContributionPrivileges()`

**Logic**: `whiteboard.createdBy === userId` for owner privilege rule

---

## Error Contracts

### Error Codes (Internal)

No new GraphQL error codes exposed. Internal errors use standard NestJS exceptions:

| Exception                      | Trigger Condition                            | HTTP Status |
| ------------------------------ | -------------------------------------------- | ----------- |
| `InternalServerErrorException` | Space admin lookup fails                     | 500         |
| `EntityNotFoundException`      | Whiteboard or authorization policy not found | 404         |
| `TransactionRollbackException` | Bulk privilege update fails                  | 500         |

---

## Testing Contracts

### Integration Test Expectations

**File**: `test/functional/integration/whiteboard-authorization.it.spec.ts`

**Scenarios**:

1. Toggling `allowGuestContributions` ON grants PUBLIC_SHARE to admins
2. Toggling `allowGuestContributions` OFF revokes PUBLIC_SHARE from all users
3. New admin granted role in enabled space receives PUBLIC_SHARE on all whiteboards
4. New whiteboard in enabled space automatically gets PUBLIC_SHARE rules
5. Partial failure in bulk operation rolls back setting and privileges

---

### Unit Test Expectations

**File**: `src/services/api/whiteboard/whiteboard.service.authorization.spec.ts`

**Mocked Dependencies**:

- `CommunityService.getAdmins()` → returns mock admin IDs
- `AuthorizationPolicyService.save()` → returns saved policy
- `EntityManager.transaction()` → invokes callback

**Test Cases**:

- `applyGuestContributionPrivileges()` adds correct privilege rules
- `applyGuestContributionPrivileges()` skips when setting disabled
- `revokePrivilege()` removes PUBLIC_SHARE rules without affecting others

---

## Performance Contracts

### Response Time Constraints

| Operation                                | Target     | Measurement Point           |
| ---------------------------------------- | ---------- | --------------------------- |
| Bulk privilege update (1000 whiteboards) | < 1 second | End-to-end transaction time |
| Single whiteboard privilege apply        | < 100ms    | Service method duration     |

**Monitoring**: Elastic APM traces with span name `whiteboard.applyGuestContributionPrivileges`

---

## Summary

- **No public API changes**: All contracts are internal service methods
- **Event-driven architecture**: Setting changes and role grants trigger privilege updates
- **Transactional safety**: Bulk operations wrapped in database transactions
- **Repository extensions**: New query methods for space admins and whiteboards
- **Testing expectations**: Integration + unit test coverage for all privilege update paths
