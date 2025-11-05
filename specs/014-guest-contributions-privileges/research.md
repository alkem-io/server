# Research: Guest Contributions Privilege Management

**Feature**: 014-guest-contributions-privileges
**Date**: 2025-11-05
**Status**: Complete

## Overview

This document consolidates technical decisions and research findings for implementing automatic PUBLIC_SHARE privilege management tied to the `allowGuestContributions` space setting.

## Technical Decisions

### 1. Privilege Enum Extension

**Decision**: Add `PUBLIC_SHARE = 'public-share'` to `AuthorizationPrivilege` enum

**Rationale**:

- Follows existing privilege naming pattern (kebab-case string values)
- Registered with GraphQL via `registerEnumType` (already in place)
- Distinct from existing privileges to avoid semantic conflicts

**Location**: `src/common/enums/authorization.privilege.ts`

**Alternatives Considered**:

- Reuse existing `CONTRIBUTE` privilege → Rejected: Too broad, doesn't capture guest-specific sharing intent
- Use `SHARE_WITH_GUESTS` → Rejected: Verbose; standard naming is action-oriented

---

### 2. Authorization Reset Cascade Pattern

**Decision**: Leverage existing `applyAuthorizationPolicy()` cascade triggered by space settings changes; extend `WhiteboardAuthorizationService.appendPrivilegeRules()` to conditionally add PUBLIC_SHARE rules

**Rationale**:

- **Existing infrastructure**: When `allowGuestContributions` changes, `SpaceService.shouldUpdateAuthorizationPolicy()` returns true, triggering `SpaceAuthorizationService.applyAuthorizationPolicy()`
- **Natural cascade**: Authorization flows Space → Collaboration → CalloutsSet → Callout → CalloutContribution → Whiteboard
- **Settings propagation**: `spaceSettings` parameter passed through cascade to all authorization services
- **Reset pattern**: Each `applyAuthorizationPolicy()` rebuilds rules from scratch (idempotent)
- **No explicit grant/revoke**: Privileges assigned statically during reset; when setting is false, rules simply aren't added

**Integration Points**:

1. **Setting change**: `SpaceResolverMutations.updateSpaceSettings()` → `applyAuthorizationPolicy()` cascade
2. **Admin role change**: `RoleSetResolverMutations.assignRoleToUser(ADMIN)` → trigger space auth reset
3. **Whiteboard creation**: Inherits parent authorization with settings already propagated

**Cascade Flow**:

```typescript
SpaceAuthorizationService.applyAuthorizationPolicy(spaceId)
  └─ propagateAuthorizationToChildEntities(space, spaceSettings)
      └─ CollaborationAuthorizationService.applyAuthorizationPolicy(collaboration, parentAuth, spaceSettings)
          └─ CalloutsSetAuthorizationService.applyAuthorizationPolicy(calloutsSet, parentAuth, spaceSettings)
              └─ CalloutAuthorizationService.applyAuthorizationPolicy(callout, parentAuth)
                  └─ CalloutContributionAuthorizationService.applyAuthorizationPolicy(contribution, parentAuth)
                      └─ WhiteboardAuthorizationService.applyAuthorizationPolicy(whiteboard, parentAuth)
                          └─ appendPrivilegeRules(authorization, whiteboard, spaceSettings) ← CHECK allowGuestContributions
```

**Alternatives Considered**:

- Event-driven explicit grant/revoke → Rejected: Doesn't align with existing reset pattern; adds complexity
- Separate privilege service → Rejected: Authorization service already centralizes this logic
- Direct authorization policy mutation → Rejected: Violates encapsulation; reset pattern is canonical

---

### 3. Space Settings Propagation Through Cascade

**Decision**: Pass `spaceSettings` parameter through authorization cascade from Collaboration down to Whiteboard

**Rationale**:

- **No queries needed**: Settings propagated as parameter through method calls
- **Existing pattern**: Services already pass parent authorization; adding settings parameter follows same pattern
- **Each space independent**: Subspaces use their own settings during their own authorization reset
- **No inheritance**: FR-003 requirement (per-whiteboard scope) naturally enforced by settings isolation

**Implementation**:

```typescript
// Collaboration level - receives from Space
CollaborationAuthorizationService.applyAuthorizationPolicy(
  collaboration: ICollaboration,
  parentAuthorization: IAuthorizationPolicy,
  spaceSettings: ISpaceSettings  // ← Passed from Space
)

// Cascades down to CalloutContribution
CalloutContributionAuthorizationService.applyAuthorizationPolicy(
  contribution: ICalloutContribution,
  parentAuthorization: IAuthorizationPolicy,
  spaceSettings: ISpaceSettings  // ← Passed through
)

// Finally to Whiteboard
WhiteboardAuthorizationService.applyAuthorizationPolicy(
  whiteboard: IWhiteboard,
  parentAuthorization: IAuthorizationPolicy,
  spaceSettings?: ISpaceSettings  // ← Used in appendPrivilegeRules()
)
```

**Alternatives Considered**:

- Query space settings in whiteboard service → Rejected: N+1 query problem; breaks cascade parameter pattern
- Store settings in authorization policy → Rejected: Pollutes authorization model with settings concerns
- Global settings cache → Rejected: Adds complexity; parameter passing is simpler and explicit

---

### 4. Transactional Safety via Resolver-Level Transaction

**Decision**: Use TypeORM `EntityManager.transaction()` at resolver level (`SpaceResolverMutations.updateSpaceSettings`) to wrap setting update + authorization cascade

**Rationale**:

- TypeORM provides transaction support: `await entityManager.transaction(async manager => { ... })`
- **Existing pattern**: `SpaceResolverMutations.updateSpaceSettings()` already calls `applyAuthorizationPolicy()` and `saveAll()`
- Rollback requirement (FR-009): "rollback all privilege changes AND revert allowGuestContributions setting to false"
- Authorization cascade naturally batches all updates for `saveAll()`

**Implementation Pattern**:

```typescript
// In SpaceResolverMutations.updateSpaceSettings()
const shouldUpdateAuthorization =
  await this.spaceService.shouldUpdateAuthorizationPolicy(
    space.id,
    settingsData.settings
  );

space = await this.spaceService.updateSettings(space.id, settingsData.settings);

if (shouldUpdateAuthorization) {
  const updatedAuthorizations =
    await this.spaceAuthorizationService.applyAuthorizationPolicy(space.id);
  await this.authorizationPolicyService.saveAll(updatedAuthorizations); // ← If this fails, entire mutation rolls back
}
```

**Alternatives Considered**:

- Manual rollback → Rejected: Error-prone; transaction guarantees atomicity
- Saga pattern → Rejected: Over-engineering for synchronous operation
- Event-based async updates → Rejected: Violates requirement for immediate consistency

---

### 5. Admin Role Change Triggers Space Authorization Reset

**Decision**: Extend `RoleSetResolverMutations.assignRoleToUser()` and `removeRoleFromUser()` to trigger space authorization reset when ADMIN role changes

**Rationale**:

- **Current behavior**: Role mutations only reset **user** authorization, not **space** authorization
- **Requirement**: FR-010 states new admins should immediately receive PUBLIC_SHARE on all whiteboards
- **Pattern alignment**: Triggering `applyAuthorizationPolicy(spaceId)` reuses existing cascade infrastructure
- **Consistency**: Ensures privileges update immediately for admin role changes, just like settings changes

**Implementation**:

```typescript
// In RoleSetResolverMutations.assignRoleToUser()
await this.roleSetService.assignUserToRole(
  roleSet,
  roleData.role,
  roleData.contributorID,
  agentInfo,
  true
);

switch (roleSet.type) {
  case RoleSetType.SPACE: {
    if (roleData.role === RoleName.ADMIN) {
      // Get space for this roleSet
      const space = await this.spaceService.getSpaceForRoleSet(roleSet.id);

      // Trigger authorization reset cascade
      const spaceAuthorizations =
        await this.spaceAuthorizationService.applyAuthorizationPolicy(space.id);
      await this.authorizationPolicyService.saveAll(spaceAuthorizations);
    }

    // Also reset user authorization (existing behavior)
    const user = await this.userLookupService.getUserOrFail(
      roleData.contributorID
    );
    const authorizations =
      await this.userAuthorizationService.applyAuthorizationPolicy(user.id);
    await this.authorizationPolicyService.saveAll(authorizations);
    break;
  }
}
```

**Alternatives Considered**:

- Event-driven privilege grant → Rejected: Doesn't align with reset pattern; adds event infrastructure
- Eventual consistency (privilege appears on next settings change) → Rejected: Violates user expectations; inconsistent with settings toggle behavior
- Manual privilege assignment → Rejected: Duplicates logic already in `appendPrivilegeRules()`

---

### 6. Observability Implementation

**Decision**: Use existing logging/metrics infrastructure

**Logging** (FR-011):

- Logger: `winston` via `WINSTON_MODULE_NEST_PROVIDER`
- Context: `LogContext.AUTHORIZATION` (or create `LogContext.GUEST_CONTRIBUTIONS`)
- Format: Structured JSON with `{ userId, whiteboardId, spaceId, action, timestamp }`

**Metrics** (FR-012):

- APM: Elastic APM already integrated (`@src/apm/decorators`)
- Use `@Profiling()` decorator on privilege assignment methods
- Custom metric: `privilege_assignment_duration_ms` histogram

**Audit** (FR-013):

- Leverage existing `ActivityLog` or `AuditLog` if available
- Otherwise: dedicated audit log table with triggering user/action

**Alternatives Considered**:

- New logging framework → Rejected: Winston already in place
- External audit service → Rejected: Out of scope; table-based audit sufficient

---

### 7. Performance via Authorization Cascade Infrastructure

**Decision**: Leverage existing `applyAuthorizationPolicy()` cascade infrastructure; batch save all updated policies

**Rationale**:

- **Requirement**: < 1 second for up to 1000 whiteboards (SC-006)
- **Existing optimization**: Authorization cascade already traverses entity relationships efficiently
- **Batch operations**: `authorizationPolicyService.saveAll(updatedPolicies)` handles bulk saves
- **No N+1 queries**: Cascade uses TypeORM relations to load child entities

**Performance Characteristics**:

```typescript
// Single call triggers cascade
const updatedAuthorizations =
  await this.spaceAuthorizationService.applyAuthorizationPolicy(spaceId);

// Returns array of ALL updated authorization policies (space + collaboration + callouts + whiteboards)
// Batch save in one operation
await this.authorizationPolicyService.saveAll(updatedAuthorizations);
```

**Optimization Points**:

1. Cascade loads entities with `relations` config (efficient joins)
2. Each authorization service builds rules in-memory (no DB calls)
3. Single bulk save at the end (one transaction)
4. No explicit whiteboard queries needed - cascade handles traversal

**Alternatives Considered**:

- Query all whiteboards explicitly → Rejected: Duplicate work; cascade already traverses
- Individual saves → Rejected: Too slow; cascade returns array for batch save
- Database stored procedure → Rejected: Breaks domain encapsulation; loses TypeScript type safety

---

## Best Practices Applied

### Authorization Reset Pattern

- **Idempotency**: `applyAuthorizationPolicy()` rebuilds rules from scratch; safe to call multiple times
- **Cascade propagation**: Settings and parent authorization flow through method parameters
- **No explicit revocation**: Privileges removed by NOT adding rules during reset (when setting is false)
- **Stateless rule generation**: `appendPrivilegeRules()` and `appendCredentialRules()` are pure functions based on current state

### TypeORM Transactions

- Transaction boundary at resolver level (`SpaceResolverMutations.updateSpaceSettings`)
- Authorization cascade returns array for single batch save
- Automatic rollback on exception (existing NestJS/TypeORM behavior)

### NestJS Dependency Injection

- Inject authorization services into resolvers and other authorization services
- Use module imports to manage dependencies
- Follow existing cascade pattern (no circular dependencies)

### Authorization Policy Patterns

- **Privilege rules**: Use `AuthorizationPolicyRulePrivilege` for mapping source → granted privileges (admins)
- **Credential rules**: Use `IAuthorizationPolicyRuleCredential` for user-specific grants (owners)
- Follow naming: `CREDENTIAL_RULE_WHITEBOARD_OWNER_PUBLIC_SHARE`, `POLICY_RULE_ADMIN_PUBLIC_SHARE`
- Set `cascade: true` for rules that should inherit to children

---

## Open Questions (Resolved)

| Question                                    | Resolution                                                                                                           |
| ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Does PUBLIC_SHARE privilege already exist?  | No—confirmed via grep search; must be added to enum                                                                  |
| How are privileges granted/revoked?         | Via authorization reset cascade; rules rebuilt from scratch based on current state                                   |
| What triggers privilege updates?            | Settings change (`shouldUpdateAuthorizationPolicy`), admin role change (explicit trigger), whiteboard creation       |
| How to handle rollback?                     | TypeORM transactions at resolver level with automatic rollback on exception                                          |
| Where to log audit trail?                   | Reuse existing logging patterns (`winston`, `LogContext.AUTHORIZATION`)                                              |
| Do we need a migration?                     | No—`AuthorizationPrivilege` is TypeScript compile-time enum only; no database schema change                          |
| How do settings propagate to whiteboards?   | Passed as parameter through authorization cascade: Collaboration → CalloutsSet → Callout → Contribution → Whiteboard |
| Do subspaces inherit parent space settings? | No—each space uses its own settings during authorization reset; natural isolation                                    |
| What happens when admin role is removed?    | Space authorization reset triggered; `appendPrivilegeRules()` no longer maps UPDATE → PUBLIC_SHARE for removed user  |
| What happens when whiteboard is deleted?    | Authorization policy auto-deleted via FK cascade; no explicit revocation needed                                      |
| How are new admins granted privileges?      | Extend `assignRoleToUser()` to trigger space auth reset when role is ADMIN                                           |

---

## Technology Stack Summary

| Component            | Technology             | Purpose                                               |
| -------------------- | ---------------------- | ----------------------------------------------------- |
| Language             | TypeScript 5.3         | Type-safe implementation                              |
| Framework            | NestJS 10.x            | DI, module boundaries, decorators                     |
| ORM                  | TypeORM 0.3.x          | Transaction management, batch save operations         |
| Database             | MySQL 8                | JSON column for authorization rules                   |
| Logging              | Winston                | Structured logging via `WINSTON_MODULE_NEST_PROVIDER` |
| Metrics              | Elastic APM            | Performance profiling via `@Profiling()` decorator    |
| Authorization        | Existing reset pattern | `applyAuthorizationPolicy()` cascade infrastructure   |
| Settings Propagation | Method parameters      | Pass `spaceSettings` through cascade                  |

---

## Summary

This feature leverages the **authorization reset cascade pattern** already present in the codebase:

1. **No new infrastructure**: Uses existing `applyAuthorizationPolicy()` cascade
2. **Settings propagation**: `spaceSettings` passed as parameter through cascade layers
3. **Conditional rule creation**: `appendPrivilegeRules()` checks `allowGuestContributions` setting
4. **Admin role integration**: Extends role mutations to trigger space auth reset
5. **Idempotent by design**: Reset pattern rebuilds all rules from scratch
6. **Transactional safety**: Resolver-level transaction ensures atomicity
7. **Performance**: Leverages existing cascade optimization (< 1s for 1000 whiteboards)

**Key Insight**: Privileges are NEVER explicitly granted or revoked. They are assigned statically during authorization reset based on current state (settings + roles).

## Implementation Readiness

✅ All technical unknowns resolved
✅ Integration points identified
✅ Performance strategy defined
✅ Observability plan complete
✅ Ready for Phase 1 (Data Model & Contracts)
