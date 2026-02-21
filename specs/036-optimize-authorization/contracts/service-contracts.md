# Service Contracts: Optimize Credential-Based Authorization

**Branch**: `036-optimize-authorization` | **Date**: 2026-02-21

## No GraphQL Schema Changes

Per FR-012 and spec clarifications, this feature introduces **no new GraphQL schema surface**. All changes are internal to domain services.

## Internal Service Contract Changes

### Phase 1: New Service — InheritedCredentialRuleSetService

```typescript
// NEW: src/domain/common/inherited-credential-rule-set/inherited.credential.rule.set.service.ts

/**
 * Find or create the InheritedCredentialRuleSet owned by the given parent policy.
 * Computes cascading rules from the parent's local + inherited rules.
 * If the row exists (by parentAuthorizationPolicyId), updates credentialRules in place.
 * If not found (first reset after migration), creates a new row.
 * Attaches the resolved set to parentAuthorization._childInheritedCredentialRuleSet
 * so that inheritParentAuthorization() can read it synchronously.
 */
async resolveForParent(
  parentAuthorization: IAuthorizationPolicy
): Promise<InheritedCredentialRuleSet>
```

**`resolveForParent()` logic**:
1. Compute cascading rules: `parent.credentialRules.filter(r => r.cascade)` + `parent.inheritedCredentialRuleSet?.credentialRules ?? []`
2. `findOne({ where: { parentAuthorizationPolicyId: parent.id } })`
3. If found → update `credentialRules`, save
4. If not found → create with `parentAuthorizationPolicyId = parent.id`, save
5. Attach: `parentAuthorization._childInheritedCredentialRuleSet = resolvedRow`
6. Return resolved row

**Called once per parent node** (~64 total for a full reset), NOT per child. After Phase 3a centralization, this is called internally by `inheritParentAuthorization()` — no manual calls needed.

### Phase 1 → Phase 3a: Modified Method — AuthorizationPolicyService.inheritParentAuthorization()

**Phase 3 (transitional — current state)**:
```typescript
// Synchronous, reads pre-resolved transient field, falls back to copy behavior
inheritParentAuthorization(
  childAuthorization: IAuthorizationPolicy | undefined,
  parentAuthorization: IAuthorizationPolicy | undefined
): IAuthorizationPolicy
```

**Phase 3a (centralized — target state)**:
```typescript
// Async, auto-resolves inherited rules internally
async inheritParentAuthorization(
  childAuthorization: IAuthorizationPolicy | undefined,
  parentAuthorization: IAuthorizationPolicy | undefined
): Promise<IAuthorizationPolicy>
```

**Behavioral change (Phase 3a)**:
- Before: copies `cascade: true` rules from parent into child's `credentialRules`
- After: checks `parentAuthorization._childInheritedCredentialRuleSet` cache. If absent, calls `resolveForParent(parentAuthorization)` internally to resolve and cache the inherited rule set. Sets `child.inheritedCredentialRuleSet = resolvedRow`. Child's `credentialRules` remains empty (local rules added later by callers).
- The `_childInheritedCredentialRuleSet` transient field acts as a per-parent-object cache: first child triggers the DB call, subsequent siblings reuse the cached result.
- Fallback path removed — no backward compat needed after centralization.
- `InheritedCredentialRuleSetService` injected into `AuthorizationPolicyService` (single injection point).

**All ~55 callers**: Add `await` (mechanical — all are already in async methods).

**~20 parent services (cleanup)**: Remove manual `resolveForParent()` calls and `InheritedCredentialRuleSetService` injection/module imports.

### Phase 1: Modified Method — AuthorizationService.isAccessGrantedForCredentials()

```typescript
// Signature unchanged
isAccessGrantedForCredentials(
  credentials: ICredentialDefinition[],
  authorization: IAuthorizationPolicy | undefined,
  privilegeRequired: AuthorizationPrivilege
): boolean

// Behavioral change:
// Before: iterates authorization.credentialRules (full inherited + local)
// After: iterates in order (inherited first for faster early exit):
//   1. authorization.inheritedCredentialRuleSet?.credentialRules (inherited — larger pool, higher match probability)
//   2. authorization.credentialRules (local only — typically 0-3 rules)
// Fallback: if inheritedCredentialRuleSet is null, evaluates credentialRules alone (backward compat)
```

### Phase 2: Modified Method Signatures (Reset Optimization)

#### SpaceAuthorizationService

```typescript
// BEFORE (current)
async applyAuthorizationPolicy(
  spaceID: string,
  providedParentAuthorization?: IAuthorizationPolicy
): Promise<IAuthorizationPolicy[]>

// AFTER (Phase 2)
async applyAuthorizationPolicy(
  spaceID: string,
  providedParentAuthorization?: IAuthorizationPolicy,
  preloadedSpace?: ISpace  // NEW: optional pre-loaded entity to skip DB load
): Promise<IAuthorizationPolicy[]>
```

#### CollaborationAuthorizationService

```typescript
// No signature change, but callers must pass a fully loaded entity with all needed relations
```

#### CalloutAuthorizationService

```typescript
// BEFORE
async applyAuthorizationPolicy(
  calloutID: string,
  parentAuthorization: IAuthorizationPolicy | undefined,
  platformRolesAccess: IPlatformRolesAccess,
  roleSet?: IRoleSet,
  spaceSettings?: ISpaceSettings
): Promise<IAuthorizationPolicy[]>

// AFTER (Phase 2)
async applyAuthorizationPolicy(
  calloutID: string,
  parentAuthorization: IAuthorizationPolicy | undefined,
  platformRolesAccess: IPlatformRolesAccess,
  roleSet?: IRoleSet,
  spaceSettings?: ISpaceSettings,
  preloadedCallout?: ICallout  // NEW: optional pre-loaded entity
): Promise<IAuthorizationPolicy[]>
```

#### CommunityAuthorizationService

```typescript
// BEFORE
async applyAuthorizationPolicy(
  communityID: string,
  parentAuthorization: IAuthorizationPolicy | undefined,
  platformRolesAccess: IPlatformRolesAccess,
  spaceSettings?: ISpaceSettings
): Promise<IAuthorizationPolicy[]>

// AFTER (Phase 2)
async applyAuthorizationPolicy(
  communityID: string,
  parentAuthorization: IAuthorizationPolicy | undefined,
  platformRolesAccess: IPlatformRolesAccess,
  spaceSettings?: ISpaceSettings,
  preloadedCommunity?: ICommunity  // NEW: optional pre-loaded entity
): Promise<IAuthorizationPolicy[]>
```

### Behavioral Contracts (Invariants)

These invariants MUST hold across both phases:

1. **Access Decision Equivalence**: For any `(credentials, entity, privilege)` triple, `isAccessGranted()` returns the same boolean before and after optimization.

2. **Reset Idempotency**: Calling `applyAuthorizationPolicy()` twice on the same tree produces identical policies. No accumulation of duplicate rules. `InheritedCredentialRuleSet` rows are found by `parentAuthorizationPolicyId` and updated in place.

3. **Cascade Correctness**: A credential rule with `cascade: true` on a parent entity is visible (either in the policy's local `credentialRules` or in its `inheritedCredentialRuleSet.credentialRules`) on all descendant entities.

4. **Non-Cascade Isolation**: A credential rule with `cascade: false` on an entity is visible ONLY on that entity, not on its children or in any `InheritedCredentialRuleSet`.

5. **Privilege Rule Locality**: `privilegeRules` are always entity-specific and never cascaded. This does not change.

6. **Root Independence**: Resetting one tree root (e.g., an Account) does not affect policies in other tree roots (e.g., User, Platform).

7. **Backward Compatibility** (Phase 1 transition): A null `inheritedCredentialRuleSet` on any policy results in the same authorization behavior as the pre-optimization system (full rules in `credentialRules`).
