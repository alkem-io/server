# Data Model: Optimize Credential-Based Authorization

**Branch**: `036-optimize-authorization` | **Date**: 2026-02-21

## Phase 1: Shared Inherited Rule Sets (Storage Reduction)

### New Entity: InheritedCredentialRuleSet

Each parent node in the authorization forest owns exactly one row in this table. All direct children of that parent reference the same row via their policy's `inheritedCredentialRuleSetId` FK.

```
inherited_credential_rule_set
├── id: uuid (PK, DEFAULT uuid_generate_v4())
├── createdDate: timestamp (NOT NULL, DEFAULT now())
├── updatedDate: timestamp (NOT NULL, DEFAULT now())
├── version: integer (NOT NULL)
├── credentialRules: jsonb (NOT NULL)     ← pre-merged cascading rules from ancestor chain
├── parentAuthorizationPolicyId: uuid (FK → authorization_policy.id, UNIQUE, NOT NULL, INDEXED)
```

**Expected cardinality**: ~64 rows in a typical deployment (one per parent node in the authorization forest). Stable across resets — rows are updated in place, never orphaned.

**Lifecycle**: During an authorization reset, the traversal code computes cascading rules once per parent node, then looks up the existing `InheritedCredentialRuleSet` by `parentAuthorizationPolicyId`. If found, the `credentialRules` JSONB is updated in place. If not found (first reset after migration), a new row is created. All direct children are assigned the same row via their policy's `inheritedCredentialRuleSetId` FK. No garbage collection is needed.

### Modified Entity: AuthorizationPolicy

```
authorization_policy
├── id: uuid (PK)
├── credentialRules: jsonb (NOT NULL)     ← CHANGED: local (entity-specific) rules only
├── privilegeRules: jsonb (NOT NULL)      ← unchanged (entity-specific, never cascaded)
├── type: varchar(128) (NOT NULL)
├── parentAuthorizationPolicyId: uuid (FK, nullable, indexed)  ← unchanged
├── inheritedCredentialRuleSetId: uuid (FK, nullable)  ← NEW: reference to shared inherited rules
├── createdDate: timestamp
├── updatedDate: timestamp
├── version: int
```

**New column**: `inheritedCredentialRuleSetId` — FK to `inherited_credential_rule_set.id`, nullable, `ON DELETE SET NULL`.

**New relation on entity class**:
```typescript
@ManyToOne(() => InheritedCredentialRuleSet, {
  eager: true,       // Loaded alongside the policy — zero extra queries
  cascade: false,    // Shared row, must not cascade
  onDelete: 'SET NULL',
})
inheritedCredentialRuleSet?: InheritedCredentialRuleSet;
```

### Key Change: credentialRules Semantics

**Before (current)**:
```json
// L2 sub-subspace entity: stores ALL rules (inherited + local)
{
  "credentialRules": [
    // Inherited from Platform root:
    {"name": "platform-global-admins", "grantedPrivileges": ["CREATE","READ","UPDATE","DELETE","GRANT"], "criterias": [{"type":"global-admin","resourceID":""}], "cascade": true},
    // Inherited from Account:
    {"name": "account-manage", "grantedPrivileges": ["CREATE","READ","UPDATE","DELETE"], "criterias": [{"type":"account-admin","resourceID":"acct-uuid"}], "cascade": true},
    {"name": "global-space-read", "grantedPrivileges": ["READ"], "criterias": [{"type":"global-spaces-reader","resourceID":""}], "cascade": true},
    // Inherited from L0 Space:
    {"name": "space-admins", "grantedPrivileges": ["CREATE","READ","UPDATE","DELETE","GRANT"], "criterias": [{"type":"space-admin","resourceID":"l0-uuid"}], "cascade": true},
    {"name": "space-members-read", "grantedPrivileges": ["READ"], "criterias": [{"type":"space-member","resourceID":"l0-uuid"}], "cascade": true},
    // Inherited from L1 Space:
    {"name": "space-admins", "grantedPrivileges": ["CREATE","READ","UPDATE","DELETE","GRANT"], "criterias": [{"type":"space-admin","resourceID":"l1-uuid"}], "cascade": true},
    {"name": "space-members-read", "grantedPrivileges": ["READ"], "criterias": [{"type":"space-member","resourceID":"l1-uuid"}], "cascade": true},
    // Own local rules:
    {"name": "space-admins", "grantedPrivileges": ["CREATE","READ","UPDATE","DELETE","GRANT"], "criterias": [{"type":"space-admin","resourceID":"l2-uuid"}], "cascade": true},
    {"name": "space-members-read", "grantedPrivileges": ["READ"], "criterias": [{"type":"space-member","resourceID":"l2-uuid"}], "cascade": true}
  ]
}
```

**After (Phase 1)**:
```json
// Same L2 sub-subspace entity: stores ONLY local rules
// credentialRules (on the policy itself):
{
  "credentialRules": [
    {"name": "space-admins", "grantedPrivileges": ["CREATE","READ","UPDATE","DELETE","GRANT"], "criterias": [{"type":"space-admin","resourceID":"l2-uuid"}], "cascade": true},
    {"name": "space-members-read", "grantedPrivileges": ["READ"], "criterias": [{"type":"space-member","resourceID":"l2-uuid"}], "cascade": true}
  ]
}
// inheritedCredentialRuleSetId → shared row containing:
// {
//   "credentialRules": [
//     platform-global-admins, account-manage, global-space-read,
//     L0 space-admins, L0 space-members-read,
//     L1 space-admins, L1 space-members-read
//   ],
// }
```

**Deduplication example**: All 50+ child entities of the same L1 Space (callouts, contributions, comments, framing, etc.) share the same inherited cascading rules. Instead of 50 copies of the same ~4KB JSONB blob, they all reference one `InheritedCredentialRuleSet` row.

### Backward Compatibility

During the transition period (after schema migration, before full authorization reset):

| State | credentialRules | inheritedCredentialRuleSetId | Runtime Behavior |
|---|---|---|---|
| **Pre-migration** | Full (inherited + local) | Column doesn't exist | Current behavior |
| **Post-schema, pre-reset** | Full (inherited + local) | NULL | Fallback: evaluate credentialRules alone |
| **Post-reset** | Local only | Set (FK to shared row) | Evaluate local + inherited rule set |

The runtime check in `isAccessGrantedForCredentials()` handles the null case:
- If `inheritedCredentialRuleSet` is null → evaluate `credentialRules` only (backward compat)
- If `inheritedCredentialRuleSet` is set → evaluate `credentialRules` (local) + `inheritedCredentialRuleSet.credentialRules` (inherited)

## Phase 2: No Data Model Changes

Phase 2 focuses on optimizing the reset traversal and save patterns **without** changing the database schema or entity definitions. The data model from Phase 1 remains unchanged.

Changes are limited to:
- Service method signatures (accepting pre-loaded entities instead of IDs)
- Traversal patterns (parallel instead of sequential, batch instead of individual)
- Save patterns (eliminating intermediate saves, consolidating to single bulk save)
- APM instrumentation and logging (using existing infrastructure)

## Validation Rules

Existing rules remain:
- `credentialRules` JSONB must be a valid array (can be empty after Phase 1 — a leaf entity may have zero local rules)
- `privilegeRules` JSONB must be a valid array
- `type` must be a valid `AuthorizationPolicyType` enum value
- `parentAuthorizationPolicy` is optional for all entities (existing behavior, unchanged)

New rules (Phase 1):
- `inheritedCredentialRuleSet.credentialRules` must be a valid, non-empty array (inherited rules always exist for non-root entities)

## State Transitions

No state machine changes. The authorization reset cycle remains:
1. Event published (RabbitMQ)
2. Consumer picks up event
3. Tree traversal computes new policies
4. Bulk save persists all updated policies (including `InheritedCredentialRuleSet` rows)
5. Completion logged

The only change in step 3 is that `inheritParentAuthorization()` now creates a single `InheritedCredentialRuleSet` row per parent node and assigns it to all direct children, instead of copying cascading rules into each child's `credentialRules` JSONB.
